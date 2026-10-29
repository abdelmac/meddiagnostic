/**
 * Read the official 20181210 BodyParts3D object set. The catalogue, concept
 * mapping and downloaded OBJ identities must agree before an object is used.
 * Downloads are public data requests; upstream application code is never run.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export const REGIONAL_SOURCE = Object.freeze({
  datasetId: "bodyparts3d-2018",
  sourceVersion: "20181210i412",
  sourceRelease: "20181210",
  sourceTree: "FMA4.12.0-inference",
  sourceUrl: "https://lifesciencedb.jp/bp3d/",
  metadataUrl: "https://lifesciencedb.jp/bp3d/get-info.cgi?version=20181210i412&cmd=concept-objfiles-list",
  mappingUrl: "https://lifesciencedb.jp/bp3d/get-info.cgi?cmd=upload-all-list&load=1&md_abbr=bp3d&md_id=1&mr_id=1&mv_id=28&title=obj2FMA&tree=isa&version=20181210i412",
  downloadUrl: "https://lifesciencedb.jp/bp3d/download.cgi",
  license: "CC-BY-SA-2.1-JP",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/2.1/jp/",
  attribution: "BodyParts3D, Copyright 2008 Database Center for Life Science (DBCLS), licensed under CC Attribution-ShareAlike 2.1 Japan",
  attributionUrl: "https://lifesciencedb.jp/bp3d/info_en/license/index.html",
  cacheDirectory: ".local/bodyparts3d-v53-audit",
});
export const REGION_SOURCE = REGIONAL_SOURCE;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const lineList = text => text.split(/\r\n|\r|\n/);
const elementPattern = /^(?:FJ|MM|CX)\d+M?$/;
// Suffixes are authored concept extensions, retained verbatim rather than passed
// off as standard FMA identifiers or collapsed into another side's concept.
const conceptPattern = /^FMA\d+(?:-[LROFNPQST])?$/;
const cacheRoot = path.resolve(REGIONAL_SOURCE.cacheDirectory);
const maxResponseBytes = 200 * 1024 * 1024;
const jsonWrite = (file, data) => {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(temporary, file);
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let crcTable;
function crc32(bytes) {
  crcTable ??= Array.from({ length: 256 }, (_, value) => {
    let current = value;
    for (let bit = 0; bit < 8; bit++) current = current & 1 ? 0xedb88320 ^ current >>> 1 : current >>> 1;
    return current >>> 0;
  });
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ crc >>> 8;
  return (crc ^ 0xffffffff) >>> 0;
}

export function readRegionalZip(bytes) {
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { end = offset; break; }
  }
  if (end < 0) throw Error("The public source did not return a ZIP archive");
  const count = bytes.readUInt16LE(end + 10);
  if (count === 65535 || bytes.readUInt16LE(end + 4) !== 0) throw Error("Unsupported multi-volume or ZIP64 source archive");
  let offset = bytes.readUInt32LE(end + 16);
  const result = [];
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw Error("Invalid source ZIP directory");
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const checksum = bytes.readUInt32LE(offset + 16);
    const compressed = bytes.readUInt32LE(offset + 20);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (flags & 1 || ![0, 8].includes(method) || size > maxResponseBytes) throw Error(`Unsupported source ZIP member: ${name}`);
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== 0x04034b50) throw Error("Invalid source ZIP member header");
    const start = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    if (start + compressed > bytes.length) throw Error("Truncated source ZIP member");
    const data = method === 8 ? inflateRawSync(bytes.subarray(start, start + compressed), { maxOutputLength: maxResponseBytes }) : bytes.subarray(start, start + compressed);
    if (data.length !== size || crc32(data) !== checksum) throw Error(`Source ZIP integrity mismatch: ${name}`);
    result.push({ name, bytes: data });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

function htmlText(value) {
  return value.replace(/<br\s*\/?\s*>/gi, "; ").replace(/<[^>]*>/g, "").replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

export function parseRegionalMetadata(relationText, mappingHtml) {
  if (!relationText.startsWith("# Data Version\t20181210i412") || !relationText.includes("# Objects set\t20181210") || !relationText.includes("# Tree version\tFMA4.12.0-inference")) throw Error("Unexpected official regional data version");
  const relations = [];
  const membership = new Map();
  for (const line of lineList(relationText)) {
    if (!line || line.startsWith("#")) continue;
    const [conceptId, mode, components] = line.split("\t");
    if (!conceptPattern.test(conceptId) || !["is_a", "part_of"].includes(mode) || !components) throw Error(`Invalid regional ontology relation: ${line.slice(0, 100)}`);
    const elementIds = components.split("+");
    if (elementIds.some(id => !elementPattern.test(id))) throw Error(`Invalid regional object ID for ${conceptId}`);
    relations.push({ conceptId, mode, elementIds });
    for (const elementId of elementIds) {
      if (!membership.has(elementId)) membership.set(elementId, new Set());
      membership.get(elementId).add(conceptId);
    }
  }
  if (membership.size !== 4679) throw Error(`Unexpected regional object set: ${membership.size}`);
  const rows = new Map();
  for (const match of mappingHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const row = {};
    for (const cell of match[1].matchAll(/<td class="([^"]+)">([\s\S]*?)<\/td>/g)) row[cell[1]] = htmlText(cell[2]);
    if (!elementPattern.test(row.art_id ?? "")) continue;
    if (rows.has(row.art_id)) throw Error(`Duplicate regional metadata object: ${row.art_id}`);
    rows.set(row.art_id, row);
  }
  const meshes = [];
  const exclusions = [];
  for (const [elementId, concepts] of membership) {
    const row = rows.get(elementId);
    if (!row || !/^BP\d+$/.test(row.rep_id ?? "") || !conceptPattern.test(row.cdi_name ?? "") || !row.cdi_name_e) {
      exclusions.push({ elementId, reason: "No unambiguous named source representation in the official release mapping" });
      continue;
    }
    if (!concepts.has(row.cdi_name)) throw Error(`Source representation is not a member of this release: ${elementId}/${row.cdi_name}`);
    meshes.push({ elementId, representationId: row.rep_id, fmaId: row.cdi_name, sourceConceptId: row.cdi_name, name: row.cdi_name_e, sourceObjectName: row.art_name, sourceObjectGroup: row.artg_name, sourceConceptMemberships: [...concepts].sort() });
  }
  meshes.sort((a, b) => a.elementId.localeCompare(b.elementId, "en", { numeric: true }));
  return { meshes, exclusions, relations, totalSourceObjects: membership.size };
}

async function readResponse(response) {
  if (!response.ok) throw Error(`Public BodyParts3D source HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length"));
  if (length > maxResponseBytes) throw Error("Public BodyParts3D response exceeds the configured byte limit");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxResponseBytes) throw Error("Public BodyParts3D response exceeds the configured byte limit");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function inspectObject(bytes, requested, catalogue) {
  const text = bytes.toString("utf8");
  const header = Object.fromEntries(lineList(text.slice(0, 8192)).filter(line => line.startsWith("#") && line.includes(":")).map(line => {
    const separator = line.indexOf(":");
    return [line.slice(1, separator).trim(), line.slice(separator + 1).trim()];
  }));
  const elementId = header["File ID"];
  const source = catalogue.get(elementId);
  if (!requested.has(elementId) || !source) return null;
  if (header["Compatibility version"] !== REGIONAL_SOURCE.sourceVersion) throw Error(`Wrong source compatibility version for ${elementId}: ${header["Compatibility version"]}`);
  if (!/^BP\d+$/.test(header["Representation ID"] ?? "") || !source.sourceConceptMemberships.includes(header["Concept ID"]) || !header["English name"]) throw Error(`Invalid source identity for ${elementId}`);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let sourceVertexCount = 0, sourceTriangles = 0;
  const geometryHash = createHash("sha256");
  for (const line of lineList(text)) {
    if (/^(?:v|vn|vt|f)\s/.test(line)) geometryHash.update(line.trim() + "\n");
    if (line.startsWith("v ")) {
      const position = line.trim().split(/\s+/).slice(1, 4).map(Number);
      if (position.length !== 3 || position.some(value => !Number.isFinite(value))) throw Error(`Non-finite source vertex for ${elementId}`);
      for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], position[axis]); max[axis] = Math.max(max[axis], position[axis]); }
      sourceVertexCount++;
    } else if (line.startsWith("f ")) {
      const count = line.trim().split(/\s+/).length - 1;
      if (count < 3) throw Error(`Empty source face for ${elementId}`);
      sourceTriangles += count - 2;
    }
  }
  if (sourceVertexCount < 3 || sourceTriangles < 1 || !max.some((value, axis) => value > min[axis])) throw Error(`No physical source surface for ${elementId}`);
  return {
    ...source,
    representationId: header["Representation ID"],
    requestedRepresentationId: source.representationId,
    fmaId: header["Concept ID"],
    sourceConceptId: header["Concept ID"],
    name: header["English name"],
    sourceVersion: header["Compatibility version"],
    sourceBuildUpLogic: header["Build-up logic"],
    sourceSha256: hash(bytes), sourceBytes: bytes.length,
    sourceGeometryTextSha256: geometryHash.digest("hex"),
    sourceTriangles, sourceVertexCount,
    bounds: { min, max },
    sourceVolumeCm3: Number(header["Volume(cm3)"]),
    sourceUrl: REGIONAL_SOURCE.downloadUrl,
    cacheFile: path.join(cacheRoot, "objs", `${elementId}.obj`),
  };
}

/** Load only cached metadata with download:false, or validated OBJ data too. */
export async function loadRegionalSource({ download = true, limit, batchSize = 35, onProgress = () => {} } = {}) {
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1)) throw Error("Regional source limit must be a positive integer");
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100) throw Error("Regional source batch size must be an integer between 1 and 100");
  fs.mkdirSync(path.join(cacheRoot, "objs"), { recursive: true });
  fs.mkdirSync(path.join(cacheRoot, "chunks"), { recursive: true });
  const headers = { "User-Agent": "Mozilla/5.0", Referer: `${REGIONAL_SOURCE.sourceUrl}?lng=en` };
  let sessionReady = false;
  async function session() {
    const response = await fetch(`${REGIONAL_SOURCE.sourceUrl}?lng=en`, { headers, signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw Error(`Public BodyParts3D viewer HTTP ${response.status}`);
    headers.Cookie = response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    // This is a public anonymous session; it is never saved or logged.
    sessionReady = true;
  }
  async function request(url, options = {}) {
    let last;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(url, { ...options, headers, signal: AbortSignal.timeout(90000), redirect: "manual" });
        if (response.status === 302) { await session(); throw Error("The public source requested a refreshed anonymous session"); }
        return await readResponse(response);
      } catch (error) { last = error; if (attempt < 3) await delay(750 * (attempt + 1)); }
    }
    throw last;
  }
  const relationFile = path.join(cacheRoot, "FMA2Obj.txt");
  const relationZip = path.join(cacheRoot, "FMA2Obj.zip");
  const mappingFile = path.join(cacheRoot, "obj2FMA-table.html");
  if (!fs.existsSync(relationFile)) {
    const bytes = await request(REGIONAL_SOURCE.metadataUrl);
    const entry = readRegionalZip(bytes).find(entry => path.basename(entry.name) === "FMA2Obj.txt");
    if (!entry) throw Error("Missing official FMA2Obj.txt member");
    fs.writeFileSync(relationZip, bytes); fs.writeFileSync(relationFile, entry.bytes);
  }
  if (!fs.existsSync(mappingFile)) fs.writeFileSync(mappingFile, await request(REGIONAL_SOURCE.mappingUrl));
  const relationBytes = fs.readFileSync(relationFile), mappingBytes = fs.readFileSync(mappingFile);
  const parsed = parseRegionalMetadata(relationBytes.toString("utf8"), mappingBytes.toString("utf8"));
  const metadata = { ...REGIONAL_SOURCE, metadataSha256: { relations: hash(relationBytes), mapping: hash(mappingBytes) }, relations: parsed.relations, relationsText: relationBytes.toString("utf8"), totalSourceObjects: parsed.totalSourceObjects, mappedObjectCount: parsed.meshes.length };
  jsonWrite(path.join(cacheRoot, "metadata-audit.json"), { ...metadata, relations: undefined, relationsText: undefined, exclusions: parsed.exclusions });
  if (!download) return { metadata, meshes: parsed.meshes, exclusions: parsed.exclusions };
  const catalogue = new Map(parsed.meshes.map(mesh => [mesh.elementId, mesh]));
  const selected = typeof limit === "number" ? parsed.meshes.slice(0, limit) : parsed.meshes;
  const indexFile = path.join(cacheRoot, "source-index.json");
  const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : { sourceVersion: REGIONAL_SOURCE.sourceVersion, meshes: {} };
  if (index.sourceVersion !== REGIONAL_SOURCE.sourceVersion) throw Error("Wrong cached regional release");
  const missing = [];
  for (const source of selected) {
    const record = index.meshes[source.elementId];
    const file = path.join(cacheRoot, "objs", `${source.elementId}.obj`);
    if (!record || !fs.existsSync(file) || fs.statSync(file).size !== record.sourceBytes || hash(fs.readFileSync(file)) !== record.sourceSha256) missing.push(source);
  }
  onProgress({ stage: "catalogue", total: selected.length, cached: selected.length - missing.length, exclusions: parsed.exclusions.length });
  if (missing.length) await session();
  for (let start = 0; start < missing.length; start += batchSize) {
    const batch = missing.slice(start, start + batchSize);
    const requested = new Set(batch.map(mesh => mesh.elementId));
    const body = new URLSearchParams({ type: "art_file", all_downloads: "1", ids: JSON.stringify([...requested]), rep_id: JSON.stringify([...new Set(batch.map(mesh => mesh.representationId))]) });
    const key = hash(Buffer.from([...requested].sort().join("+"))).slice(0, 20);
    const archiveFile = path.join(cacheRoot, "chunks", `${key}.zip`);
    const bytes = fs.existsSync(archiveFile) ? fs.readFileSync(archiveFile) : await request(REGIONAL_SOURCE.downloadUrl, { method: "POST", body });
    const entries = readRegionalZip(bytes);
    const found = new Set();
    for (const entry of entries) {
      if (!entry.name.endsWith(".obj")) continue;
      const record = inspectObject(entry.bytes, requested, catalogue);
      if (!record) continue;
      if (found.has(record.elementId)) {
        if (index.meshes[record.elementId]?.sourceGeometryTextSha256 !== record.sourceGeometryTextSha256) throw Error(`Conflicting duplicate source geometry: ${record.elementId}`);
        continue;
      }
      record.sourceArchiveSha256 = hash(bytes);
      record.sourceArchiveEntry = entry.name;
      fs.writeFileSync(record.cacheFile, entry.bytes);
      index.meshes[record.elementId] = record;
      found.add(record.elementId);
    }
    const absent = [...requested].filter(id => !found.has(id));
    if (absent.length) throw Error(`The source omitted requested physical objects: ${absent.join(", ")}`);
    if (!fs.existsSync(archiveFile)) fs.writeFileSync(archiveFile, bytes);
    jsonWrite(indexFile, index);
    onProgress({ stage: "download", downloaded: Math.min(start + batch.length, missing.length), pending: missing.length, total: selected.length });
    if (start + batchSize < missing.length) await delay(150);
  }
  const meshes = selected.map(source => index.meshes[source.elementId]);
  return { metadata, meshes, exclusions: parsed.exclusions };
}
