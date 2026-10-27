/**
 * Convert the reviewed Z-Anatomy Blender staging into a local asset pack.
 * No network access, upstream code execution, publication or public/ writes.
 * Default: private preview. --publication-approved records the owner's explicit
 * CC BY-SA 4.0 publication decision; it still writes assets only under .local/.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { createAnatomyGltfEncoder } from "./lib/anatomy-gltf-encoder.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STAGING = path.join(ROOT, ".local/z-anatomy-source/staging-private");
const OUTPUT = path.join(ROOT, ".local/z-anatomy-preview-assets");
const REVIEW = path.join(
  ROOT,
  ".local/comprehensive-research/CLASSIFICATION-REVIEW.json",
);
const EXCLUSIONS = path.join(
  ROOT,
  ".local/comprehensive-research/LICENCE-EXCLUSIONS.json",
);
const CLIENT = path.join(ROOT, "src/data/z-anatomy-manifest.json");
const PREFIX = "/anatomy/z-anatomy";
const SOURCE_PIN = "caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0";
const SOURCE_SHA256 =
  "9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd";
const DATASET = "Z-Anatomy neurovascular";
const RELEASE_SOURCE_URL =
  "https://medquiz-europe.medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip";
const SYSTEMS = ["skeleton", "muscles", "organs", "nerves", "vessels"];
const MAX_ASSET_BYTES = 24 * 1024 * 1024;
const PREVIEW_BATCH_BYTES = 8 * 1024 * 1024;
const PREVIEW_ERROR = 0.0005;
const POSITION_ERROR = 0.00002;
const NORMAL_ERROR = 1;
const EXPECTED_UNDEFINED_NORMALS = 230;
const ATTRIBUTION =
  "Z-Anatomy — Gauthier Kervyn and contributors; underlying BodyParts3D — Database Center for Life Science and Kousaku Okubo.";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const writeJson = (filename, data) =>
  fs.writeFileSync(filename, JSON.stringify(data, null, 2) + "\n");
const fileHash = async (filename) => {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(filename)) digest.update(chunk);
  return digest.digest("hex");
};
const physicalId = (name) =>
  "ZA_" + hash(Buffer.from(name, "utf8")).slice(0, 16);

const systemMapping = {
  skeletal: "skeleton",
  joints: "skeleton",
  muscular: "muscles",
  "muscular-insertions": "muscles",
  cardiovascular: "vessels",
  "nervous-and-senses": "nerves",
  visceral: "organs",
  lymphatic: "organs",
  regions: "organs",
};

/** A vascular display material alone cannot turn a CNS object into a vessel. */
export function reviewedAnatomySystem(decision) {
  const mappedSystems = new Set(
    decision.systems.map((system) => systemMapping[system]),
  );
  if (mappedSystems.size !== 1 || mappedSystems.has(undefined))
    throw Error(`Ambiguous reviewed system: ${decision.name}`);
  const system = [...mappedSystems][0];
  if (
    ["arterial", "venous"].includes(decision.vascularKind) &&
    system !== "vessels"
  )
    throw Error(
      `Arterial/venous classification requires the vascular system: ${decision.name}`,
    );
  return system;
}

// These match real named source structures, not approximate neighbouring routes.
// Vascular classification itself comes only from the reviewed source metadata.
const legacyRules = {
  clavicle: /^Clavicle\.[lr]$/i,
  scapula: /^Scapula\.[lr]$/i,
  humerus: /^Humerus\.[lr]$/i,
  radius: /^Radius\.[lr]$/i,
  ulna: /^Ulna\.[lr]$/i,
  femur: /^Femur\.[lr]$/i,
  pelvis: /^(Hip bone|Coxal bone|Os coxae|Ilium|Ischium|Pubis)\.[lr]$/i,
  patella: /^Patella\.[lr]$/i,
  tibia: /^Tibia\.[lr]$/i,
  deltoid:
    /^(Acromial|Clavicular|Scapular spinal) part of deltoid muscle\.[lr]$/i,
  biceps: /^(Long|Short) head of biceps brachii\.[lr]$/i,
  triceps: /^(Long|Lateral|Medial) head of triceps brachii\.[lr]$/i,
  "pectoralis-major":
    /^(Clavicular|Sternocostal) head of pectoralis major muscle\.[lr]$|^\(Abdominal part of pectoralis major muscle\)\.[lr]$/i,
  "rectus-abdominis": /^Rectus abdominis muscle\.[lr]$/i,
  quadriceps:
    /^(Vastus (intermedius|lateralis|medialis)|Rectus femoris) muscle\.[lr]$/i,
  diaphragm: /^Diaphragm$/i,
  "median-nerve": /^Median nerve\.[lr]$/i,
  "ulnar-nerve": /^Ulnar nerve\.[lr]$/i,
  "radial-nerve": /^Radial nerve\.[lr]$/i,
  "sciatic-nerve": /^Sciatic nerve\.[lr]$/i,
  "femoral-nerve": /^Femoral nerve\.[lr]$/i,
  "tibial-nerve": /^Tibial nerve\.[lr]$/i,
  "brachial-plexus":
    /^(Roots|Superior trunk|Middle trunk|Inferior trunk|Lateral cord|Medial cord|Posterior cord) of brachial plexus\.[lr]$/i,
  "spinal-cord":
    /^Spinal cord$|^(Cervical|Thoracic|Lumbar|Sacral|Coccygeal) (part|segment) of spinal cord$/i,
  heart:
    /^(Heart|Left atrium|Right atrium|Left ventricle|Right ventricle|Myocardium)$/i,
  lungs: /^(Superior|Middle|Inferior) lobe of (left|right) lung$/i,
  liver: /^Liver$/i,
  stomach: /^Stomach$/i,
  kidneys: /^(Left kidney|Right kidney|Kidney\.[lr])$/i,
  bladder: /^Urinary bladder$/i,
  aorta:
    /^(Ascending aorta|Arch of aorta|Aortic arch|Thoracic aorta|Abdominal aorta)$/i,
  carotid:
    /^((Left|Right) common carotid artery|(Internal|External) carotid artery\.[lr])$/i,
  "subclavian-artery": /^(Left|Right) subclavian artery$/i,
  "femoral-artery": /^Femoral artery\.[lr]$/i,
  "inferior-vena-cava":
    /^Inferior vena cava( \((abdominal|thoracic) part\))?$/i,
  "pulmonary-artery": /^(Pulmonary trunk|(Left|Right) pulmonary artery)$/i,
};

function readAttribute(fd, fileBytes, record, type, components) {
  const bytesPer = type === "Uint16" ? 2 : 4;
  if (
    !record ||
    record.componentType !== type ||
    record.components !== components ||
    !Number.isSafeInteger(record.count) ||
    record.count <= 0 ||
    !Number.isSafeInteger(record.byteOffset) ||
    record.byteOffset < 0 ||
    record.byteOffset % bytesPer ||
    record.byteLength !== record.count * components * bytesPer ||
    record.byteOffset + record.byteLength > fileBytes
  )
    throw Error(`Invalid staged ${type}/${components} attribute`);
  const bytes = Buffer.allocUnsafe(record.byteLength);
  let read = 0;
  while (read < bytes.length) {
    const count = fs.readSync(
      fd,
      bytes,
      read,
      bytes.length - read,
      record.byteOffset + read,
    );
    if (!count) throw Error("Unexpected end of staged geometry");
    read += count;
  }
  const Typed =
    type === "Float32"
      ? Float32Array
      : type === "Uint32"
        ? Uint32Array
        : Uint16Array;
  return {
    values: new Typed(bytes.buffer, bytes.byteOffset, bytes.length / bytesPer),
    sha256: hash(bytes),
  };
}

/**
 * Some authored corners have undefined (exactly zero) normals. Derive lighting
 * from their incident source faces only, leaving every valid authored normal
 * and every position/index bit untouched. This is not new anatomical geometry.
 */
export function repairUndefinedSourceNormals(position, normal, indices) {
  if (
    position.length !== normal.length ||
    position.length % 3 ||
    indices.length % 3
  )
    throw Error("Malformed source geometry arrays");
  const missing = new Set();
  for (let vertex = 0; vertex < normal.length / 3; vertex++) {
    const offset = vertex * 3;
    if (
      normal[offset] === 0 &&
      normal[offset + 1] === 0 &&
      normal[offset + 2] === 0
    )
      missing.add(vertex);
  }
  const method =
    "area-weighted normals of incident evaluated source triangles, only for exactly zero authored corner normals";
  if (!missing.size) return { normal, repairedIndices: [], method };
  const accumulated = new Map(
    [...missing].map((vertex) => [vertex, [0, 0, 0]]),
  );
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index],
      b = indices[index + 1],
      c = indices[index + 2];
    if (
      a >= normal.length / 3 ||
      b >= normal.length / 3 ||
      c >= normal.length / 3
    )
      throw Error("Source triangle index out of range");
    if (!missing.has(a) && !missing.has(b) && !missing.has(c)) continue;
    const ab = [0, 1, 2].map(
      (axis) => position[b * 3 + axis] - position[a * 3 + axis],
    );
    const ac = [0, 1, 2].map(
      (axis) => position[c * 3 + axis] - position[a * 3 + axis],
    );
    const face = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    for (const vertex of [a, b, c]) {
      const sum = accumulated.get(vertex);
      if (sum) for (let axis = 0; axis < 3; axis++) sum[axis] += face[axis];
    }
  }
  const repaired = Float32Array.from(normal);
  for (const [vertex, sum] of accumulated) {
    const length = Math.hypot(...sum);
    if (!(length > 0) || !Number.isFinite(length))
      throw Error(
        `Undefined source normal has no nondegenerate incident face: ${vertex}`,
      );
    for (let axis = 0; axis < 3; axis++)
      repaired[vertex * 3 + axis] = sum[axis] / length;
  }
  return { normal: repaired, repairedIndices: [...missing], method };
}

/** Bit-exact position+normal welding retains hard edges and every triangle. */
export function weldGeometryExact(position, normal, indices) {
  if (
    position.length !== normal.length ||
    position.length % 3 ||
    indices.length % 3
  )
    throw Error("Malformed source geometry arrays");
  const count = position.length / 3;
  const positionBits = new Uint32Array(
    position.buffer,
    position.byteOffset,
    position.length,
  );
  const normalBits = new Uint32Array(
    normal.buffer,
    normal.byteOffset,
    normal.length,
  );
  const remap = new Uint32Array(count),
    unique = new Map();
  const weldedPosition = new Float32Array(position.length),
    weldedNormal = new Float32Array(normal.length);
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  let written = 0;
  for (let index = 0; index < count; index++) {
    const offset = index * 3;
    const length = Math.hypot(
      normal[offset],
      normal[offset + 1],
      normal[offset + 2],
    );
    if (!Number.isFinite(length) || Math.abs(length - 1) > 0.001)
      throw Error(`Invalid authored normal at source vertex ${index}`);
    for (let axis = 0; axis < 3; axis++) {
      const value = position[offset + axis];
      if (!Number.isFinite(value)) throw Error("Non-finite source position");
      bounds.min[axis] = Math.min(bounds.min[axis], value);
      bounds.max[axis] = Math.max(bounds.max[axis], value);
    }
    const key = `${positionBits[offset]},${positionBits[offset + 1]},${positionBits[offset + 2]},${normalBits[offset]},${normalBits[offset + 1]},${normalBits[offset + 2]}`;
    let target = unique.get(key);
    if (target === undefined) {
      target = written++;
      unique.set(key, target);
      weldedPosition.set(position.subarray(offset, offset + 3), target * 3);
      weldedNormal.set(normal.subarray(offset, offset + 3), target * 3);
    }
    remap[index] = target;
  }
  const weldedIndices = new Uint32Array(indices.length);
  for (let index = 0; index < indices.length; index++) {
    if (indices[index] >= count)
      throw Error("Source triangle index out of range");
    weldedIndices[index] = remap[indices[index]];
  }
  return {
    position: weldedPosition.slice(0, written * 3),
    normal: weldedNormal.slice(0, written * 3),
    indices: weldedIndices,
    bounds,
  };
}

function displayName(review) {
  if (review.neutralLabelRequired)
    return `Unnamed source structure ${physicalId(review.name)}`;
  const match = review.name.match(/^(.*)\.([lr])$/);
  return match
    ? `${match[2] === "l" ? "Left" : "Right"} ${match[1]}`
    : review.name.trim();
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args.length === 1 && args[0] !== "--publication-approved")
  )
    throw Error(
      "Usage: node scripts/import-z-anatomy.mjs [--publication-approved]. Assets always stay under .local/; use the flag only after the owner's explicit CC BY-SA 4.0 publication approval.",
    );
  const publicationApproved = args[0] === "--publication-approved";
  const publicationStatus = publicationApproved
    ? "approved"
    : "private-preview-pending-approval";
  const attribution = publicationApproved
    ? ATTRIBUTION
    : `${ATTRIBUTION} Private preview; publication approval pending.`;
  const publicationBasis = publicationApproved
    ? {
        kind: "owner-authorized-cc-by-sa-4.0-release",
        approvedAt: "2026-10-28",
        instruction: "Oui, appliquer CC BY-SA 4.0 et publier cet atlas",
        applicationCodeLicense: "CC-BY-SA-4.0",
        assetAdaptationLicense: "CC-BY-SA-4.0",
        upstreamComponentTermsPreserved: true,
        conservativeSourceExclusionsRetained: true,
        blanketLegalClearanceClaim: false,
        additionalPersonalAuthorPermissionClaim: false,
        sourceCodeUrl: RELEASE_SOURCE_URL,
      }
    : { kind: "private-preview-pending-owner-publication-approval" };
  const stageFile = path.join(STAGING, "index.json");
  if (!fs.existsSync(stageFile))
    throw Error(
      "Reviewed Blender staging is not complete: index.json is absent.",
    );
  const stageBytes = fs.readFileSync(stageFile),
    reviewBytes = fs.readFileSync(REVIEW),
    exclusionsBytes = fs.readFileSync(EXCLUSIONS);
  const stage = JSON.parse(stageBytes),
    review = JSON.parse(reviewBytes),
    exclusions = JSON.parse(exclusionsBytes);
  if (
    stage.schema !== "ippomed-z-anatomy-mesh-v1" ||
    stage.sourcePin !== SOURCE_PIN ||
    stage.sourceSha256 !== SOURCE_SHA256 ||
    stage.sourceCodeExecuted !== false ||
    stage.privateOnly !== true ||
    stage.productionRedistributionReviewed !== false ||
    stage.rejected?.length ||
    stage.byteOrder !== "little-endian" ||
    stage.coordinateSystem !== "Y-up metres: Blender (x,y,z) -> (x,z,-y)" ||
    review.sourcePin !== SOURCE_PIN ||
    exclusions.source.pin !== SOURCE_PIN ||
    exclusions.privateInspectionPermitted !== true ||
    exclusions.productionRedistributionReviewed !== false
  )
    throw Error(
      "Staging or source review does not match the pinned private import contract",
    );
  const reviewed = new Map(
    review.objects.map((record) => [record.name, record]),
  );
  if (reviewed.size !== review.objects.length)
    throw Error("Duplicate reviewed source object names");
  const expected = new Set(exclusions.privateCandidateObjectNames);
  const names = new Set(stage.objects.map((record) => record.sourceObjectName));
  if (
    names.size !== stage.objects.length ||
    names.size !== expected.size ||
    [...expected].some((name) => !names.has(name))
  )
    throw Error(
      "Staging objects differ from the exact reviewed private allowlist",
    );
  // Check every included classification before mutating the private output.
  for (const name of names) {
    const decision = reviewed.get(name);
    if (!decision) throw Error(`Missing reviewed source object: ${name}`);
    reviewedAnatomySystem(decision);
  }
  const binaryFile = path.join(STAGING, "geometry.bin"),
    binaryBytes = fs.statSync(binaryFile).size;
  if (
    stage.binary !== "geometry.bin" ||
    binaryBytes !== stage.counts.binaryBytes ||
    stage.counts.objects !== names.size
  )
    throw Error("Staging file size or object count mismatch");
  // Keep the whole input hash streaming; individual source arrays are read on demand.
  console.log(
    `Verifying private staging: ${names.size} reviewed authored objects, ${binaryBytes} bytes`,
  );
  const binarySha256 = await fileHash(binaryFile);
  const encoder = createAnatomyGltfEncoder({
    attribution,
    generator: "Ippomed Z-Anatomy importer",
    positionErrorMetres: POSITION_ERROR,
    normalErrorDegrees: NORMAL_ERROR,
  });
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  fs.mkdirSync(path.join(OUTPUT, "preview"), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT, "high"), { recursive: true });
  const fd = fs.openSync(binaryFile, "r"),
    records = [],
    provenance = [],
    files = [];
  const batches = Object.fromEntries(
    SYSTEMS.map((system) => [
      system,
      {
        items: [],
        rawBytes: 0,
        count: 0,
        files: [],
        triangles: 0,
        highTriangles: 0,
      },
    ]),
  );
  let maximumPositionError = 0,
    maximumNormalError = 0,
    repairedZeroNormals = 0;
  const previewBudgetExceptions = [];
  function writeAsset(url, bytes, metadata) {
    if (bytes.length > MAX_ASSET_BYTES)
      throw Error(`Asset exceeds 24 MiB: ${url}`);
    if (!url.startsWith(PREFIX + "/") || url.includes(".."))
      throw Error("Unsafe private asset path");
    fs.writeFileSync(path.join(OUTPUT, url.slice(PREFIX.length + 1)), bytes);
    const record = {
      url,
      bytes: bytes.length,
      sha256: hash(bytes),
      ...metadata,
    };
    files.push(record);
    return record;
  }
  function flushPreview(system) {
    const batch = batches[system];
    if (!batch.items.length) return;
    function writeChunk(items) {
      const bytes = encoder.makeGlb(items, system, "preview");
      if (bytes.length > MAX_ASSET_BYTES) {
        if (items.length < 2)
          throw Error(
            `Preview object cannot fit private asset budget: ${items[0].mesh.id}`,
          );
        const middle = Math.ceil(items.length / 2);
        writeChunk(items.slice(0, middle));
        writeChunk(items.slice(middle));
        return;
      }
      const url = `${PREFIX}/preview/${system}-${String(batch.files.length + 1).padStart(3, "0")}.glb`;
      const asset = writeAsset(url, bytes, {
        level: "preview",
        system,
        meshIds: items.map((item) => item.mesh.id),
        triangles: items.reduce(
          (sum, item) => sum + item.data.indices.length / 3,
          0,
        ),
      });
      batch.files.push(asset);
    }
    writeChunk(batch.items);
    batch.items = [];
    batch.rawBytes = 0;
  }
  try {
    for (const [ordinal, item] of stage.objects.entries()) {
      const decision = reviewed.get(item.sourceObjectName);
      if (
        !decision?.privateExportCandidate ||
        decision.excludedForLicenceReview ||
        decision.technicalExclusionReasons?.length
      )
        throw Error(
          `Unreviewed or excluded source object: ${item.sourceObjectName}`,
        );
      const system = reviewedAnatomySystem(decision),
        id = physicalId(item.sourceObjectName);
      const positions = readAttribute(
        fd,
        binaryBytes,
        item.positions,
        "Float32",
        3,
      );
      const normals = readAttribute(
        fd,
        binaryBytes,
        item.normals,
        "Float32",
        3,
      );
      const indices = readAttribute(fd, binaryBytes, item.indices, "Uint32", 1);
      const materials = readAttribute(
        fd,
        binaryBytes,
        item.materialIndices,
        "Uint16",
        1,
      );
      if (
        item.vertexCount !== positions.values.length / 3 ||
        item.triangles !== indices.values.length / 3 ||
        item.triangles !== materials.values.length ||
        normals.values.length !== positions.values.length
      )
        throw Error(`Staged topology mismatch: ${item.sourceObjectName}`);
      const normalRepair = repairUndefinedSourceNormals(
        positions.values,
        normals.values,
        indices.values,
      );
      repairedZeroNormals += normalRepair.repairedIndices.length;
      const geometry = weldGeometryExact(
        positions.values,
        normalRepair.normal,
        indices.values,
      );
      const legacyIds = Object.entries(legacyRules)
        .filter(
          ([, rule]) =>
            decision.sourceNamed && rule.test(item.sourceObjectName),
        )
        .map(([legacyId]) => legacyId);
      const vascularKind =
        decision.vascularKind === "arterial"
          ? "artery"
          : decision.vascularKind === "venous"
            ? "vein"
            : system === "vessels"
              ? "other"
              : undefined;
      const contextualSkin = decision.sourceMaterials.some((material) =>
        /^Skin(?:-|$)/.test(material),
      );
      const mesh = {
        id,
        elementId: id,
        representationId: id,
        name: displayName(decision),
        source: {
          originalName: item.sourceObjectName,
          named: decision.sourceNamed,
        },
        sourceObjectName: item.sourceObjectName,
        sourceVersion: SOURCE_PIN,
        system,
        legacyIds,
        defaultVisible: !contextualSkin,
        ...(vascularKind ? { vascularKind } : {}),
      };
      const encoded = encoder.quantization(geometry);
      const high = encoder.selectVertices(geometry, encoded, geometry.indices);
      maximumPositionError = Math.max(
        maximumPositionError,
        encoded.maxPositionError,
      );
      maximumNormalError = Math.max(maximumNormalError, encoded.maxNormalError);
      const highAssets = [];
      function splitHigh(data, suffix = "") {
        const bytes = encoder.makeGlb([{ mesh, data }], system, "high");
        if (bytes.length > MAX_ASSET_BYTES) {
          const middle = Math.floor(data.indices.length / 6) * 3;
          if (middle < 3) throw Error(`HIGH cannot be split: ${id}`);
          splitHigh(
            encoder.selectVertices(
              null,
              data,
              Uint32Array.from(data.indices.subarray(0, middle)),
            ),
            suffix + "a",
          );
          splitHigh(
            encoder.selectVertices(
              null,
              data,
              Uint32Array.from(data.indices.subarray(middle)),
            ),
            suffix + "b",
          );
          return;
        }
        const url = `${PREFIX}/high/${id}${suffix ? "-" + suffix : ""}.glb`;
        highAssets.push(
          writeAsset(url, bytes, {
            level: "high",
            system,
            meshIds: [id],
            triangles: data.indices.length / 3,
            vertexCount: data.vertexCount,
          }),
        );
      }
      splitHigh(high);
      if (
        highAssets.reduce((sum, asset) => sum + asset.triangles, 0) !==
        item.triangles
      )
        throw Error(`HIGH source triangles changed: ${id}`);
      const target = Math.min(
        item.triangles,
        Math.max(80, Math.min(12000, Math.floor(item.triangles * 0.25))),
      );
      const [previewIndices, previewError] = MeshoptSimplifier.simplify(
        geometry.indices,
        geometry.position,
        3,
        target * 3,
        PREVIEW_ERROR,
        ["ErrorAbsolute", "LockBorder"],
      );
      if (previewError > PREVIEW_ERROR + 1e-8)
        throw Error(`Preview appearance error exceeds its bound: ${id}`);
      const preview = encoder.selectVertices(geometry, encoded, previewIndices);
      // The error bound is the safety priority: never silently exceed it to
      // force a triangle budget on a complex authored source surface.
      if (preview.indices.length / 3 > 12000)
        previewBudgetExceptions.push({
          id,
          sourceObjectName: item.sourceObjectName,
          triangles: preview.indices.length / 3,
          estimatedErrorMetres: previewError,
        });
      const batch = batches[system],
        rawBytes =
          preview.position.byteLength +
          preview.normal.byteLength +
          preview.indices.byteLength;
      if (batch.rawBytes + rawBytes > PREVIEW_BATCH_BYTES) flushPreview(system);
      batch.items.push({ mesh, data: preview });
      batch.rawBytes += rawBytes;
      batch.count++;
      batch.triangles += preview.indices.length / 3;
      batch.highTriangles += item.triangles;
      const lod = {
        ...(highAssets.length === 1 ? { url: highAssets[0].url } : {}),
        files: highAssets.map((asset) => asset.url),
        bytes: highAssets.reduce((sum, asset) => sum + asset.bytes, 0),
        triangles: item.triangles,
        vertexCount: high.vertexCount,
      };
      records.push({
        ...mesh,
        bounds: geometry.bounds,
        triangles: preview.indices.length / 3,
        vertexCount: preview.vertexCount,
        sourceTriangles: item.triangles,
        sourceVertexCount: item.vertexCount,
        weldedVertexCount: geometry.position.length / 3,
        classificationMethod: decision.classificationMethod,
        neuralKind: decision.neuralKind,
        previewErrorMetres: previewError,
        quantization: {
          positionBits: encoded.quantized ? 16 : 32,
          positionErrorMetres: encoded.maxPositionError,
          normalBits: 16,
          normalErrorDegrees: encoded.maxNormalError,
          translation: encoded.translation,
          uniformScale: encoded.scale,
        },
        lod,
      });
      provenance.push({
        id,
        sourceObjectName: item.sourceObjectName,
        sourceDataName: item.sourceDataName,
        sourceType: item.sourceType,
        geometryKey: item.geometryKey,
        sourcePin: SOURCE_PIN,
        system,
        sourceSystems: decision.systems,
        vascularKind,
        neuralKind: decision.neuralKind,
        classificationMethod: decision.classificationMethod,
        sourceNamed: decision.sourceNamed,
        neutralLabelRequired: decision.neutralLabelRequired,
        sourceParent: decision.sourceParent,
        sourceAncestors: decision.sourceAncestors,
        sourceCollections: decision.sourceCollections,
        sourceCollectionPaths: decision.sourceCollectionPaths,
        sourceMaterials: decision.sourceMaterials,
        vascularEvidence: decision.vascularEvidence,
        vascularClassificationReason: decision.vascularClassificationReason,
        neuralEvidence: decision.neuralEvidence,
        worldMatrixRowMajor: item.worldMatrixRowMajor,
        reflectionCorrected: item.reflectionCorrected,
        sourceBounds: item.bounds,
        convertedBounds: geometry.bounds,
        sourceTriangles: item.triangles,
        highTriangles: lod.triangles,
        sourceVertexCount: item.vertexCount,
        evaluatedVertexCount: item.evaluatedVertexCount,
        weldedVertexCount: geometry.position.length / 3,
        sourceHasCustomNormals: item.sourceHasCustomNormals,
        normalMethod: item.normalMethod,
        normalRepair: {
          method: normalRepair.method,
          repairedCount: normalRepair.repairedIndices.length,
          repairedCornerIndices: normalRepair.repairedIndices,
        },
        attributes: {
          positions: { ...item.positions, sha256: positions.sha256 },
          normals: { ...item.normals, sha256: normals.sha256 },
          indices: { ...item.indices, sha256: indices.sha256 },
          materialIndices: {
            ...item.materialIndices,
            sha256: materials.sha256,
          },
        },
      });
      if ((ordinal + 1) % 100 === 0 || ordinal + 1 === stage.objects.length)
        console.log(
          `Converted ${ordinal + 1}/${stage.objects.length} private authored objects`,
        );
    }
  } finally {
    fs.closeSync(fd);
  }
  for (const system of SYSTEMS) flushPreview(system);
  if (repairedZeroNormals !== EXPECTED_UNDEFINED_NORMALS)
    throw Error(
      `Unexpected authored zero-normal repair count: ${repairedZeroNormals}, reviewed ${EXPECTED_UNDEFINED_NORMALS}`,
    );
  if (new Set(records.map((mesh) => mesh.id)).size !== records.length)
    throw Error("Stable source ID collision");
  const highTriangles = records.reduce(
    (sum, mesh) => sum + mesh.sourceTriangles,
    0,
  );
  if (highTriangles !== stage.counts.triangles)
    throw Error("Evaluated source triangle total mismatch");
  const systems = SYSTEMS.map((id) => ({
    id,
    files: batches[id].files.map((asset) => asset.url),
    bytes: batches[id].files.reduce((sum, asset) => sum + asset.bytes, 0),
    meshCount: batches[id].count,
    triangles: batches[id].triangles,
    highTriangles: batches[id].highTriangles,
  }));
  const common = {
    schemaVersion: 1,
    status: "ready",
    publicationStatus,
    ...(publicationApproved ? { publicationApprovedAt: "2026-10-28" } : {}),
    datasetId: "z-anatomy-neurovascular",
    dataset: DATASET,
    source: exclusions.source.repository,
    attribution,
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
    bounds: {
      min: [0, 1, 2].map((axis) =>
        Math.min(...records.map((mesh) => mesh.bounds.min[axis])),
      ),
      max: [0, 1, 2].map((axis) =>
        Math.max(...records.map((mesh) => mesh.bounds.max[axis])),
      ),
    },
  };
  const full = {
    ...common,
    privateOnly: !publicationApproved,
    publicationBasis,
    publicationReview: {
      ownerPublicationApproved: publicationApproved,
      componentReviewScope:
        "Conservative source-component exclusions; not a blanket provenance or legal-clearance certificate",
      excludedComponentsRemainExcluded: true,
      blanketLegalClearanceClaim: false,
    },
    ...(publicationApproved
      ? {
          license: "CC-BY-SA-4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          licenseScope:
            "This Z-Anatomy adaptation and the owner's application-code publication decision. Existing component credits and their applicable upstream terms remain recorded; other BodyParts3D atlas versions keep their separate notices.",
        }
      : {}),
    generatedAt: new Date().toISOString(),
    importer: "scripts/import-z-anatomy.mjs",
    sourcePin: SOURCE_PIN,
    sourceSha256: SOURCE_SHA256,
    sourceArchive: exclusions.source,
    sourceEvidence: exclusions.evidence,
    licenses: exclusions.licences,
    viewerScopeReview: {
      upstreamAppCodeCopied: false,
      sourceDefinitionsOrWikipediaCopied: false,
      sourceTranslationsCopied: false,
      authoredModelDataOnly: true,
      authorPosition: exclusions.viewerScopeReview.authorPosition,
      authorPositionSource: exclusions.viewerScopeReview.authorPositionSource,
      codePublicationAuthorised: publicationApproved,
      publicReleaseNeedsOwnerApproval: !publicationApproved,
      resolution: publicationApproved
        ? "The owner explicitly approved publication of the application code and this atlas under CC BY-SA 4.0 on 2026-10-28. Conservative exclusions and upstream component terms remain in effect; no additional personal author permission is asserted."
        : "Private preview pending the owner's publication and application-code licensing decision.",
    },
    sourceReview: {
      classificationReviewSha256: hash(reviewBytes),
      licenceExclusionsSha256: hash(exclusionsBytes),
      stagingIndexSha256: hash(stageBytes),
      stagingBinarySha256: binarySha256,
      stagingBinaryBytes: binaryBytes,
      sourceCodeExecuted: false,
      blenderVersion: stage.blenderVersion,
      stagingFilter: stage.filter ?? stage.postExportFilter ?? null,
      stagingIndexRevision: stage.indexRevision,
      orphanedBinaryRanges: stage.orphanedBinaryRanges ?? [],
      sourcePolicyReviewedAt: exclusions.reviewedAt,
      sourcePolicyPublicationStatusAtReview: exclusions.publicationStatus,
      sourcePolicyProductionRedistributionReviewedAtReview:
        exclusions.productionRedistributionReviewed,
      sourceViewerScopeSnapshotAtReview: exclusions.viewerScopeReview,
    },
    exclusions: {
      counts: exclusions.counts,
      excludedObjectNames: exclusions.excludedObjectNames,
      excludedPhysicalObjectNames: exclusions.excludedPhysicalObjectNames,
      rules: exclusions.exclusionRules,
      geometryPolicy: exclusions.geometryPolicy,
    },
    normalization: {
      appliedBy: "scripts/export-z-anatomy.py",
      sourceUnits: "metres",
      sourceUp: "+Z",
      up: "+Y",
      anterior: "+Z",
      rotationDegreesX: -90,
      positionTransform: "(x, y, z) -> (x, z, -y)",
      commonWorldCoordinates: true,
      perSystemCentering: false,
      perObjectWorldMatrixBaked: true,
      positionsAlreadyTransformed: true,
      normalTransform:
        "inverse transpose of common rotation times source evaluated world matrix",
      reflectedWindingCorrected: true,
    },
    classification: {
      method:
        "Pinned official collection/ancestry and effective material metadata, reviewed before export. Arterial/venous classification also requires the official cardiovascular top-level system; a display material alone never classifies a CNS object as a vessel. No object-name keyword inference for arterial, venous or neural classification.",
      sourceSystemMapping: systemMapping,
      reviewedRules: exclusions.classificationRules,
    },
    lodPolicy: {
      high: "Every evaluated source triangle retained; exact position+normal welding, lossless reordering and Meshopt compression only. No subdivision, smoothing or geometric decimation.",
      authoredNormalPolicy:
        "All valid authored normals are preserved. Only exactly zero source corner normals receive area-weighted normals derived from their incident evaluated source triangles; positions and topology are unchanged.",
      repairedZeroSourceNormals: repairedZeroNormals,
      normalRepairObjects: provenance
        .filter((item) => item.normalRepair.repairedCount > 0)
        .map((item) => ({
          id: item.id,
          sourceObjectName: item.sourceObjectName,
          ...item.normalRepair,
        })),
      preview:
        "25% target, at most 12000 triangles where the 0.5 mm estimated appearance error and locked authored boundaries permit; exceptions explicitly listed.",
      previewMaximumEstimatedErrorMetres: PREVIEW_ERROR,
      previewTriangleTargetMaximum: 12000,
      previewBudgetExceptions,
      maximumPositionErrorMetres: POSITION_ERROR,
      measuredMaximumPositionErrorMetres: maximumPositionError,
      maximumNormalErrorDegrees: NORMAL_ERROR,
      measuredMaximumNormalErrorDegrees: maximumNormalError,
      maximumAssetBytes: MAX_ASSET_BYTES,
      limitations:
        "Preview error is a meshoptimizer appearance estimate, not a medical accuracy guarantee. Source curves are evaluated from their authored bevel/extrude settings; no routes or radii are invented. This reviewed corpus is not every anatomical nerve or microvessel.",
    },
    files,
    provenance,
  };
  const lean = {
    ...common,
    meshes: records.map(
      ({
        id,
        elementId,
        representationId,
        name,
        source,
        system,
        legacyIds,
        bounds,
        defaultVisible,
        vascularKind,
        lod,
      }) => ({
        id,
        elementId,
        representationId,
        name,
        source,
        system,
        legacyIds,
        bounds,
        defaultVisible,
        ...(vascularKind ? { vascularKind } : {}),
        lod,
      }),
    ),
  };
  const notice = [
    attribution,
    publicationApproved
      ? "PUBLICATION APPROVED BY THE OWNER ? CC BY-SA 4.0 adaptation, with the upstream component credits and applicable terms below retained."
      : "PRIVATE LOCAL PREVIEW ? PUBLICATION APPROVAL PENDING.",
    "Source: " + exclusions.source.repository,
    "Pinned commit: " + SOURCE_PIN,
    "Pinned Blender source SHA-256: " + SOURCE_SHA256,
    "General model adaptation licence: Creative Commons Attribution-ShareAlike 4.0 International (https://creativecommons.org/licenses/by-sa/4.0/). Underlying BodyParts3D attribution/licence and component exceptions remain applicable.",
    exclusions.evidence.pinnedLicence,
    "",
    publicationApproved
      ? "The owner explicitly approved publication of this atlas and the application code under CC BY-SA 4.0 on 2026-10-28. This follows the upstream author's stated position that the independent viewer's code also be shared. The release source code is available at: " +
        RELEASE_SOURCE_URL
      : "The author's independent-viewer/model-pack position and component provenance remain subject to the owner's publication and application-code licensing decision. This private conversion does not grant publication approval.",
    "Author position: " + exclusions.evidence.independentViewerQuestion,
    "Model pack discussion: " +
      exclusions.evidence.independentModelPackQuestion,
    "The owner's approval does not assert additional personal permission from source contributors or certify complete component provenance. Conservative source-component exclusions remain in effect; this is not a blanket legal-clearance certificate.",
    "",
    "Upstream component credits and stated terms (including excluded exceptions, which are not relicensed by this notice):",
    ...exclusions.licences.map((licence) =>
      [
        licence.component +
          ": " +
          (licence.statedLicence ??
            "unresolved upstream component terms; conservatively excluded"),
        licence.attribution ?? "",
        licence.source ?? "",
        licence.original ?? "",
        licence.note ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "",
    "Excluded physical objects: " +
      exclusions.counts.physicalLicenceExclusions +
      " for licence/provenance review, " +
      exclusions.counts.physicalTechnicalExclusions +
      " technical exclusions. Full decisions and source evidence are recorded in manifest.json. Source definitions, Wikipedia text, translations and upstream application code were not copied or executed.",
    "",
    "Adaptation: evaluated source world coordinates converted once from Blender Z-up metres to Y-up metres, bilateral object transforms retained, reflected winding corrected. HIGH retains every evaluated source triangle. Every valid nonzero authored corner normal is retained before explicitly bounded quantization and lossless compression/reordering; the exactly zero source-normal exception is documented below. Preview alone is simplified with a 0.5 mm estimated appearance error limit. Missing anatomy, trajectories, fibres and radii are never generated.",
    "",
  ].join("\n\n");
  const normalNotice = `\nAuthored normal exception: ${repairedZeroNormals} exactly zero source corner normals in ${provenance.filter((item) => item.normalRepair.repairedCount > 0).length} objects were undefined in the source. Only these lighting normals were derived from their incident source triangle faces. Every nonzero authored normal, source position and source triangle remains unchanged before bounded encoding. Source normal-array SHA-256 and repaired corner indices are recorded per object in manifest.json.\n`;
  fs.writeFileSync(path.join(OUTPUT, "ATTRIBUTION.txt"), notice + normalNotice);
  fs.writeFileSync(path.join(OUTPUT, "LICENSE.txt"), notice + normalNotice);
  writeJson(path.join(OUTPUT, "manifest.json"), full);
  writeJson(CLIENT, lean);
  const result = {
    status: publicationApproved
      ? "publication-approved-ready"
      : "private-ready",
    publicationStatus,
    sourceObjects: records.length,
    sourceTriangles: highTriangles,
    previewTriangles: systems.reduce(
      (sum, system) => sum + system.triangles,
      0,
    ),
    previewBudgetExceptions: previewBudgetExceptions.length,
    files: files.length,
    maximumAssetBytes: Math.max(...files.map((file) => file.bytes)),
    highBytes: files
      .filter((file) => file.level === "high")
      .reduce((sum, file) => sum + file.bytes, 0),
    previewBytes: files
      .filter((file) => file.level === "preview")
      .reduce((sum, file) => sum + file.bytes, 0),
    maximumPositionErrorMetres: maximumPositionError,
    maximumNormalErrorDegrees: maximumNormalError,
    fullManifestSha256: await fileHash(path.join(OUTPUT, "manifest.json")),
    leanManifestSha256: await fileHash(CLIENT),
    fullManifest: path.relative(ROOT, path.join(OUTPUT, "manifest.json")),
    clientManifest: path.relative(ROOT, CLIENT),
  };
  writeJson(path.join(OUTPUT, "import-result.json"), result);
  console.log(JSON.stringify(result, null, 2));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.stack ?? error);
    process.exitCode = 1;
  });
}
