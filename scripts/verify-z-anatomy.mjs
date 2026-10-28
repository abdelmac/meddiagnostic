/** Offline audit of the private Z-Anatomy pack against the reviewed source export.
 * This is an optional data audit, not a CI test requiring a downloaded atlas.
 * Usage: node scripts/verify-z-anatomy.mjs [--assets-root .local/...]
 * Exit 2 means private input data are not ready; exit 1 is an audit failure.
 */
import fs from "node:fs";
import { legacyCodeLicenceFile, legacySourceUrl, retiredSourceArchiveUrl } from "./lib/legacy-source-notices.mjs";
import path from "node:path";
import crypto from "node:crypto";
import { MeshoptDecoder } from "meshoptimizer";
import { repairUndefinedSourceNormals } from "./import-z-anatomy.mjs";

const SOURCE_PIN = "caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0";
const SOURCE_SHA =
  "9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd";
const OFFICIAL_CODE_LICENCE_SHA =
  "28a9529c7d0bb4dc51f4bf5c116a3d16ef247a052f7591466768ddf563fd1cf5";
const POSITION_ERROR = 0.00002;
const NORMAL_ERROR = 1;
const SYSTEMS = ["skeleton", "muscles", "organs", "nerves", "vessels"];
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const identifier = (name) =>
  "ZA_" + sha(Buffer.from(name, "utf8")).slice(0, 16);
const runtimeVascularKind = (kind, system) =>
  kind === "arterial"
    ? "artery"
    : kind === "venous"
      ? "vein"
      : system === "vessels"
        ? "other"
        : null;
async function hashFile(filename) {
  const digest = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(filename)) digest.update(chunk);
  return digest.digest("hex");
}
const options = {
  assetsRoot: ".local/z-anatomy-preview-assets",
  lean: "src/data/z-anatomy-manifest.json",
  staging: ".local/z-anatomy-source/staging-private/index.json",
  sourceInventory: ".local/z-anatomy-source/inventory.json",
  policy: ".local/comprehensive-research/LICENCE-EXCLUSIONS.json",
  review: ".local/comprehensive-research/CLASSIFICATION-REVIEW.json",
  report: ".local/z-anatomy-source/validation-report.json",
};
const flags = {
  "--assets-root": "assetsRoot",
  "--lean": "lean",
  "--staging-index": "staging",
  "--source-inventory": "sourceInventory",
  "--policy": "policy",
  "--review": "review",
  "--report": "report",
};
for (let index = 2; index < process.argv.length; index++) {
  const option = flags[process.argv[index]];
  if (!option || !process.argv[index + 1])
    throw Error("Unknown or incomplete argument: " + process.argv[index]);
  options[option] = process.argv[++index];
}
options.manifest = path.join(options.assetsRoot, "manifest.json");
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  status: "running",
  privateOnly: true,
  publicationStatus: "private-preview-pending-approval",
  checks: 0,
  inputs: options,
  failures: [],
  coverage: {},
  geometry: {},
  files: [],
};
const check = (condition, message) => {
  report.checks++;
  if (!condition) throw Error(message);
};
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sameSet = (actual, expected, label) => {
  const a = new Set(actual),
    b = new Set(expected);
  check(a.size === actual.length, label + ": duplicate entries");
  check(
    a.size === b.size && [...a].every((value) => b.has(value)),
    label + ": different sets",
  );
};
function save() {
  fs.mkdirSync(path.dirname(options.report), { recursive: true });
  fs.writeFileSync(options.report, JSON.stringify(report, null, 2) + "\n");
}
function finiteVector(values, size, label) {
  check(
    Array.isArray(values) &&
      values.length === size &&
      values.every(Number.isFinite),
    label + ": invalid vector",
  );
}
function compareBounds(actual, expected, tolerance, label) {
  finiteVector(actual?.min, 3, label + ".min");
  finiteVector(actual?.max, 3, label + ".max");
  for (let axis = 0; axis < 3; axis++) {
    check(actual.min[axis] <= actual.max[axis], label + ": reversed bounds");
    check(
      Math.abs(actual.min[axis] - expected.min[axis]) <= tolerance &&
        Math.abs(actual.max[axis] - expected.max[axis]) <= tolerance,
      label + ": bounds differ from shared source coordinates",
    );
  }
}
function assetPath(url) {
  check(
    typeof url === "string" && url.startsWith("/anatomy/z-anatomy/"),
    "Unexpected atlas asset URL: " + url,
  );
  const relative = url.slice("/anatomy/z-anatomy/".length);
  const resolved = path.resolve(options.assetsRoot, relative),
    root = path.resolve(options.assetsRoot) + path.sep;
  check(resolved.startsWith(root), "Asset path escapes the private pack");
  return resolved;
}
function diskGlbs(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    check(!entry.isSymbolicLink(), "Unexpected link inside private assets");
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? diskGlbs(filename)
      : entry.isFile() && /\.glb$/i.test(entry.name)
        ? [
            "/anatomy/z-anatomy/" +
              path
                .relative(options.assetsRoot, filename)
                .split(path.sep)
                .join("/"),
          ]
        : [];
  });
}
function readArray(fd, specification) {
  check(
    specification &&
      Number.isSafeInteger(specification.byteOffset) &&
      specification.byteOffset >= 0 &&
      Number.isSafeInteger(specification.byteLength),
    "Invalid source buffer range",
  );
  const buffer = Buffer.alloc(specification.byteLength);
  check(
    fs.readSync(fd, buffer, 0, buffer.length, specification.byteOffset) ===
      buffer.length,
    "Truncated source geometry",
  );
  const constructors = {
    Float32: Float32Array,
    Uint32: Uint32Array,
    Uint16: Uint16Array,
  };
  const Constructor = constructors[specification.componentType];
  check(
    Constructor &&
      buffer.length ===
        specification.count *
          specification.components *
          Constructor.BYTES_PER_ELEMENT,
    "Inconsistent source array length",
  );
  const bytes = Uint8Array.from(buffer); // aligned storage, independent of Buffer's pooled byteOffset
  const values = new Constructor(bytes.buffer);
  values.sourceSha256 = sha(buffer);
  return values;
}
function parseGlb(bytes, label) {
  check(
    bytes.length >= 28 &&
      bytes.readUInt32LE(0) === 0x46546c67 &&
      bytes.readUInt32LE(4) === 2 &&
      bytes.readUInt32LE(8) === bytes.length,
    label + ": invalid GLB header",
  );
  let offset = 12,
    gltf,
    binary;
  while (offset < bytes.length) {
    check(offset + 8 <= bytes.length, label + ": truncated chunk header");
    const length = bytes.readUInt32LE(offset),
      type = bytes.readUInt32LE(offset + 4);
    offset += 8;
    check(
      length % 4 === 0 && offset + length <= bytes.length,
      label + ": invalid chunk range",
    );
    if (type === 0x4e4f534a) {
      check(!gltf, label + ": duplicate JSON chunk");
      gltf = JSON.parse(
        bytes.subarray(offset, offset + length).toString("utf8"),
      );
    }
    if (type === 0x004e4942) {
      check(!binary, label + ": duplicate binary chunk");
      binary = bytes.subarray(offset, offset + length);
    }
    offset += length;
  }
  check(gltf?.asset?.version === "2.0" && binary, label + ": incomplete GLB");
  check(
    gltf.extensionsRequired?.includes("EXT_meshopt_compression"),
    label + ": compression declaration missing",
  );
  check(
    !gltf.images?.length && !gltf.skins?.length && !gltf.animations?.length,
    label + ": unexpected external content",
  );
  check(
    gltf.buffers.every((buffer) => !buffer.uri),
    label + ": external buffer forbidden",
  );
  return { gltf, binary };
}
const component = {
  5122: { bytes: 2, read: "getInt16" },
  5123: { bytes: 2, read: "getUint16" },
  5125: { bytes: 4, read: "getUint32" },
  5126: { bytes: 4, read: "getFloat32" },
};
const widths = { SCALAR: 1, VEC3: 3 };
function reader(gltf, binary, label) {
  const cache = new Map();
  function bufferView(index) {
    if (cache.has(index)) return cache.get(index);
    const view = gltf.bufferViews[index],
      extension = view?.extensions?.EXT_meshopt_compression;
    check(
      view &&
        extension?.buffer === 0 &&
        extension.count * extension.byteStride === view.byteLength,
      label + ": invalid Meshopt view",
    );
    const start = extension.byteOffset || 0;
    check(
      start >= 0 &&
        extension.byteLength > 0 &&
        start + extension.byteLength <= binary.length,
      label + ": compressed range outside BIN",
    );
    const decoded = new Uint8Array(view.byteLength);
    MeshoptDecoder.decodeGltfBuffer(
      decoded,
      extension.count,
      extension.byteStride,
      binary.subarray(start, start + extension.byteLength),
      extension.mode,
      extension.filter || "NONE",
    );
    const result = {
      bytes: decoded,
      stride: view.byteStride || extension.byteStride,
    };
    cache.set(index, result);
    return result;
  }
  return (accessorIndex) => {
    const accessor = gltf.accessors[accessorIndex],
      format = component[accessor?.componentType],
      width = widths[accessor?.type];
    check(
      accessor &&
        format &&
        width &&
        Number.isSafeInteger(accessor.count) &&
        accessor.count > 0 &&
        !accessor.sparse,
      label + ": invalid accessor",
    );
    const decoded = bufferView(accessor.bufferView),
      stride = decoded.stride || format.bytes * width,
      start = accessor.byteOffset || 0;
    check(
      start + (accessor.count - 1) * stride + width * format.bytes <=
        decoded.bytes.length,
      label + ": accessor outside decoded view",
    );
    const view = new DataView(
      decoded.bytes.buffer,
      decoded.bytes.byteOffset,
      decoded.bytes.byteLength,
    );
    return {
      ...accessor,
      width,
      get: (index, axis = 0) =>
        view[format.read](start + index * stride + axis * format.bytes, true),
    };
  };
}
function cyclicKey(a, b, c) {
  let x = a,
    y = b,
    z = c;
  if (b < x || (b === x && (c < y || (c === y && a < z))))
    [x, y, z] = [b, c, a];
  if (c < x || (c === x && (a < y || (a === y && b < z))))
    [x, y, z] = [c, a, b];
  return x + "," + y + "," + z;
}
function sourceTopology(
  record,
  sourceGeometry,
  position,
  normal,
  translation,
  scale,
  includeTriangles = true,
) {
  const p = sourceGeometry.position,
    n = sourceGeometry.normal,
    canonical = new Map(),
    sourceKeys = new Uint32Array(record.vertexCount);
  const quantized = position.componentType === 5123;
  let maxPositionError = 0,
    maxNormalErrorDegrees = 0;
  check(
    p.length === record.vertexCount * 3 &&
      n.length === p.length &&
      sourceGeometry.indices.length === record.triangles * 3,
    record.sourceObjectName + ": source array counts differ",
  );
  for (let vertex = 0; vertex < record.vertexCount; vertex++) {
    const values = [];
    let positionErrorSquared = 0;
    for (let axis = 0; axis < 3; axis++) {
      const raw = p[vertex * 3 + axis];
      check(
        Number.isFinite(raw),
        record.sourceObjectName + ": nonfinite source position",
      );
      const encoded = quantized
        ? Math.round((raw - translation[axis]) / scale[axis])
        : raw;
      if (quantized)
        check(
          encoded >= 0 && encoded <= 65535,
          record.sourceObjectName +
            ": source position outside declared quantization",
        );
      values.push(encoded);
      positionErrorSquared +=
        (encoded * scale[axis] + translation[axis] - raw) ** 2;
    }
    for (let axis = 0; axis < 3; axis++)
      values.push(
        normal.componentType === 5122
          ? Math.round(Math.max(-1, Math.min(1, n[vertex * 3 + axis])) * 32767)
          : n[vertex * 3 + axis],
      );
    maxPositionError = Math.max(
      maxPositionError,
      Math.sqrt(positionErrorSquared),
    );
    const sourceNormal = [n[vertex * 3], n[vertex * 3 + 1], n[vertex * 3 + 2]],
      decodedNormal = values.slice(3);
    check(
      sourceNormal.every(Number.isFinite) && Math.hypot(...sourceNormal) > 0,
      record.sourceObjectName + ": invalid source normal",
    );
    const dot =
      sourceNormal.reduce(
        (sum, value, axis) => sum + value * decodedNormal[axis],
        0,
      ) /
      (Math.hypot(...sourceNormal) * Math.hypot(...decodedNormal));
    maxNormalErrorDegrees = Math.max(
      maxNormalErrorDegrees,
      (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI,
    );
    const key = values.join("|");
    if (!canonical.has(key)) canonical.set(key, canonical.size);
    sourceKeys[vertex] = canonical.get(key);
  }
  const triangles = new Map(),
    indices = sourceGeometry.indices;
  for (let i = 0; includeTriangles && i < indices.length; i += 3) {
    check(
      indices[i] < sourceKeys.length &&
        indices[i + 1] < sourceKeys.length &&
        indices[i + 2] < sourceKeys.length,
      record.sourceObjectName + ": source index outside vertices",
    );
    const key = cyclicKey(
      sourceKeys[indices[i]],
      sourceKeys[indices[i + 1]],
      sourceKeys[indices[i + 2]],
    );
    triangles.set(key, (triangles.get(key) || 0) + 1);
  }
  check(
    maxPositionError <= POSITION_ERROR + 1e-7 &&
      maxNormalErrorDegrees <= NORMAL_ERROR,
    record.sourceObjectName +
      ": source quantization error exceeds the declared limit",
  );
  return { canonical, triangles, maxPositionError, maxNormalErrorDegrees };
}
async function main() {
  const missing = [
    "manifest",
    "lean",
    "staging",
    "sourceInventory",
    "policy",
    "review",
  ].filter((key) => !fs.existsSync(options[key]));
  if (missing.length) {
    report.status = "pending-inputs";
    report.missing = missing.map((key) => options[key]);
    save();
    console.log(
      "Private Z-Anatomy audit pending: " + report.missing.join(", "),
    );
    process.exitCode = 2;
    return;
  }
  await MeshoptDecoder.ready;
  const full = json(options.manifest),
    lean = json(options.lean),
    stage = json(options.staging),
    policy = json(options.policy),
    review = json(options.review),
    original = json(options.sourceInventory);
  const byName = new Map(
    stage.objects.map((object) => [object.sourceObjectName, object]),
  );
  const reviewByName = new Map(
    review.objects.map((object) => [object.name, object]),
  );
  const originalByName = new Map(
    original.objects.map((object) => [object.name, object]),
  );
  report.policySha256 = sha(fs.readFileSync(options.policy));
  report.manifestSha256 = sha(fs.readFileSync(options.manifest));
  report.publicationStatus = full.publicationStatus;
  report.privateOnly = full.privateOnly;
  report.deploymentVerified = false;
  check(
    policy.productionRedistributionReviewed === false &&
      policy.viewerScopeReview.publicReleaseNeedsResolution === true,
    "Historical private source-review snapshot was lost",
  );
  check(
    full.status === "ready" && lean.status === "ready",
    "Manifest not yet ready",
  );
  check(
    ["private-preview-pending-approval", "approved"].includes(
      full.publicationStatus,
    ) && lean.publicationStatus === full.publicationStatus,
    "Manifests must agree on their explicit publication status",
  );
  if (full.publicationStatus === "approved") {
    check(
      full.privateOnly === false &&
        full.publicationReview?.ownerPublicationApproved === true &&
        full.publicationReview?.blanketLegalClearanceClaim === false &&
        full.publicationBasis?.kind ===
          "owner-authorized-cc-by-sa-4.0-release" &&
        full.publicationBasis?.approvedAt === "2026-10-28",
      "Approved release requires explicit owner authority, distinct from third-party clearance",
    );
    check(
      full.publicationBasis.sourceCodeUrl === legacySourceUrl ||
        (path.resolve(options.manifest).startsWith(path.resolve('.local') + path.sep) && full.publicationBasis.sourceCodeUrl === retiredSourceArchiveUrl),
      "The public legacy release must identify its verified source revision; retired archive references are historical private inputs only",
    );
    check(
      fs.existsSync(legacyCodeLicenceFile) &&
        sha(fs.readFileSync(legacyCodeLicenceFile)) === OFFICIAL_CODE_LICENCE_SHA,
      "Previously approved code must retain the unmodified historical CC BY-SA 4.0 legal text",
    );
    report.publicationReview = full.publicationReview;
    report.originalApplicationCodeLicence = "CC-BY-SA-4.0";
    report.applicationSourceUrl = full.publicationBasis.sourceCodeUrl;
  } else {
    check(
      full.privateOnly === true &&
        full.productionRedistributionReviewed === false,
      "Unapproved preview must remain private",
    );
  }
  check(
    stage.sourcePin === SOURCE_PIN &&
      stage.sourceSha256 === SOURCE_SHA &&
      stage.sourceCodeExecuted === false,
    "Unexpected source provenance",
  );
  check(
    stage.coordinateSystem === "Y-up metres: Blender (x,y,z) -> (x,z,-y)",
    "Source export does not declare a common coordinate frame",
  );
  check(
    stage.privateOnly === true &&
      stage.productionRedistributionReviewed === false &&
      stage.rejected.length === 0,
    "Source export is incomplete or not private",
  );
  check(
    policy.privateCandidateObjectNames.length === 3642 &&
      stage.objects.length === 3642 &&
      full.meshes.length === 3642 &&
      lean.meshes.length === 3642,
    "Expected 3642 reviewed source objects after removing the group title",
  );
  check(
    full.sourceReview.licenceExclusionsSha256 === report.policySha256 &&
      full.sourceReview.classificationReviewSha256 ===
        sha(fs.readFileSync(options.review)) &&
      full.sourceReview.stagingIndexSha256 ===
        sha(fs.readFileSync(options.staging)),
    "Private source review hashes changed",
  );
  check(
    full.normalization?.commonWorldCoordinates === true &&
      full.normalization.perSystemCentering === false &&
      full.normalization.positionTransform === "(x, y, z) -> (x, z, -y)",
    "Manifest normalization does not preserve the common source frame",
  );
  sameSet(
    stage.objects.map((object) => object.sourceObjectName),
    policy.privateCandidateObjectNames,
    "Source allowlist",
  );
  sameSet(
    full.meshes.map((mesh) => mesh.id),
    lean.meshes.map((mesh) => mesh.id),
    "Lean manifest IDs",
  );
  sameSet(
    full.systems.map((system) => system.id),
    SYSTEMS,
    "Anatomical systems",
  );
  const fullById = new Map(),
    leanById = new Map(lean.meshes.map((mesh) => [mesh.id, mesh]));
  const provenanceById = new Map(
    full.provenance.map((record) => [record.id, record]),
  );
  check(
    provenanceById.size === full.provenance.length,
    "Duplicate provenance entries",
  );
  sameSet(
    [...provenanceById.keys()],
    full.meshes.map((mesh) => mesh.id),
    "Source provenance IDs",
  );
  for (const mesh of full.meshes) {
    const name = mesh.source?.originalName ?? mesh.sourceObjectName;
    check(
      typeof name === "string" &&
        name === mesh.sourceObjectName &&
        byName.has(name),
      mesh.id + ": missing exact source object identity",
    );
    check(
      mesh.id === identifier(name),
      name + ": ID must hash the exact UTF-8 source name",
    );
    check(
      leanById.get(mesh.id).source?.originalName === name,
      name + ": lean source identity changed",
    );
    check(!fullById.has(mesh.id), name + ": duplicate ID");
    fullById.set(mesh.id, mesh);
    check(
      mesh.fmaId == null && leanById.get(mesh.id).fmaId == null,
      name + ": FMA was inferred without a source mapping",
    );
    const reviewed = reviewByName.get(name),
      sourceObject = byName.get(name),
      originalObject = originalByName.get(name);
    check(
      reviewed?.privateExportCandidate === true,
      name + ": not in the reviewed allowlist",
    );
    check(
      (mesh.vascularKind ?? null) ===
        runtimeVascularKind(reviewed.vascularKind, mesh.system),
      name + ": vascular classification differs from source review",
    );
    if (["artery", "vein"].includes(mesh.vascularKind)) {
      check(
        mesh.system === "vessels" &&
          reviewed.systems.includes("cardiovascular"),
        name +
          ": a vascular palette does not type a non-cardiovascular structure as an artery or vein",
      );
    }
    check(
      (mesh.neuralKind ?? null) === reviewed.neuralKind,
      name + ": neural classification differs from source review",
    );
    if (reviewed.neuralKind === "nerve-or-branch-material-or-system-evidence") {
      const evidence = reviewed.neuralEvidence;
      check(
        evidence.nerveMaterials.length > 0 ||
          (reviewed.systems.includes("nervous-and-senses") &&
            evidence.nerveCollections.length > 0),
        name + ": nerve classification lacks source evidence",
      );
    }
    check(
      mesh.lod?.triangles === sourceObject.triangles,
      name + ": HIGH triangle count was changed",
    );
    check(
      mesh.triangles > 0 && mesh.triangles <= mesh.lod.triangles,
      name + ": invalid preview triangle count",
    );
    compareBounds(
      mesh.bounds,
      sourceObject.bounds,
      POSITION_ERROR + 1e-7,
      name,
    );
    finiteVector(sourceObject.worldMatrixRowMajor, 16, name + ".sourceWorld");
    // The sole frame change is (x,y,z)->(x,z,-y), for every system and side.
    const sourceMatrix = originalObject.worldMatrixRowMajor;
    const expected = [
      ...sourceMatrix.slice(0, 4),
      ...sourceMatrix.slice(8, 12),
      ...sourceMatrix.slice(4, 8).map((value) => -value),
      ...sourceMatrix.slice(12, 16),
    ];
    check(
      sourceObject.worldMatrixRowMajor.every(
        (value, index) => Math.abs(value - expected[index]) < 0.00001,
      ),
      name + ": per-object or per-system recentering detected",
    );
    check(
      !sourceObject.negativeDeterminant ||
        sourceObject.reflectionCorrected === true,
      name + ": mirrored side winding was not corrected",
    );
    if (reviewed.neutralLabelRequired)
      check(
        mesh.source?.named === false,
        name + ": unnamed source needs a neutral label",
      );
  }
  const fullNames = new Set(full.meshes.map((mesh) => mesh.sourceObjectName));
  check(
    policy.excludedPhysicalObjectNames.length === 206,
    "Unexpected licence exclusion review count",
  );
  for (const name of policy.excludedObjectNames)
    check(!fullNames.has(name), name + ": excluded provenance entered pack");
  const technical = review.objects.filter(
    (object) =>
      object.physicalCandidate && object.technicalExclusionReasons.length > 0,
  );
  check(technical.length === 59, "Unexpected technical exclusion count");
  for (const object of technical)
    check(
      !fullNames.has(object.name),
      object.name + ": source helper entered pack",
    );
  for (const [kind, expected] of [
    ["artery", 425],
    ["vein", 230],
  ])
    check(
      full.meshes.filter((mesh) => mesh.vascularKind === kind).length ===
        expected,
      kind + ": classification count changed",
    );
  check(
    policy.classificationRules
      .typedVesselRequiresOfficialTopLevelCardiovascularSystem === true,
    "Vascular typing must require the official Cardiovascular system",
  );
  for (const side of ["l", "r"]) {
    const name = "Choroid plexus." + side;
    const mesh = fullById.get(identifier(name)),
      reviewed = reviewByName.get(name);
    check(
      mesh?.system === "nerves" &&
        mesh.neuralKind === "central-nervous-structure" &&
        mesh.vascularKind == null,
      name +
        ": choroid plexus must remain a central nervous structure, without an artery flag",
    );
    check(
      reviewed.vascularKind === null &&
        reviewed.vascularEvidence.materialArterial.includes("Artery") &&
        reviewed.vascularClassificationReason?.includes(
          "Cardiovascular system",
        ),
      name +
        ": retain the palette evidence and document why it does not type an artery",
    );
  }
  const cardiovascularDisplayObjects = full.meshes.filter(
    (mesh) => mesh.system === "vessels",
  ).length;
  const otherCardiovascularObjects = full.meshes.filter(
    (mesh) => mesh.system === "vessels" && mesh.vascularKind === "other",
  ).length;
  check(
    cardiovascularDisplayObjects === 672 && otherCardiovascularObjects === 17,
    "Cardiovascular group must be 425 arterial + 230 venous + 17 other structures",
  );
  const nerveBranches = full.meshes.filter(
    (mesh) => mesh.neuralKind === "nerve-or-branch-material-or-system-evidence",
  ).length;
  const centralStructures = full.meshes.filter(
    (mesh) => mesh.neuralKind === "central-nervous-structure",
  ).length;
  const nervousDisplayObjects = full.meshes.filter(
    (mesh) => mesh.system === "nerves",
  ).length;
  check(
    nerveBranches === 251 &&
      centralStructures === 91 &&
      nervousDisplayObjects === 390,
    "Neural source classification counts changed",
  );
  const requiredNerves = [
    "Sciatic nerve",
    "Femoral nerve",
    "Tibial nerve",
    "Common fibular nerve",
    "Saphenous nerve",
    "Sural nerve",
    "Obturator nerve",
  ];
  const requiredVessels = [
    "Femoral artery",
    "Femoral vein",
    "Popliteal artery",
    "Great saphenous vein",
    "Small saphenous vein",
  ];
  for (const base of [...requiredNerves, ...requiredVessels])
    for (const side of ["l", "r"]) {
      const name = base + "." + side,
        mesh = fullById.get(identifier(name)),
        sourceObject = byName.get(name);
      check(
        mesh?.sourceObjectName === name && sourceObject?.sourceType === "CURVE",
        name + ": missing real bilateral authored curve",
      );
      check(sourceObject.triangles > 0, name + ": has no evaluated geometry");
      if (requiredNerves.includes(base))
        check(
          originalByName.get(name).bevelDepth > 0 && mesh.system === "nerves",
          name + ": missing source nerve profile or system",
        );
    }
  const referenced = new Map();
  for (const system of full.systems)
    for (const url of system.files || []) referenced.set(url, "preview");
  for (const mesh of full.meshes)
    for (const url of mesh.lod.files || [mesh.lod.url])
      referenced.set(url, "high");
  // File-level hashes are supplied by the full manifest; lean keeps only runtime metadata.
  const inventory = full.files ?? full.assetFiles ?? full.assets ?? [];
  const fileRows = Array.isArray(inventory)
    ? inventory
    : Object.entries(inventory).map(([url, item]) => ({ url, ...item }));
  const fileMetadata = new Map(
    fileRows.map((file) => [file.url ?? file.path, file]),
  );
  sameSet(
    fileRows.map((file) => file.url ?? file.path),
    [...referenced.keys()],
    "File inventory",
  );
  sameSet(
    diskGlbs(options.assetsRoot),
    [...referenced.keys()],
    "Private disk assets, including stale files",
  );
  const seen = { preview: new Map(), high: new Map() };
  const binaryFile = path.resolve(path.dirname(options.staging), stage.binary);
  check(
    (await hashFile(binaryFile)) === full.sourceReview.stagingBinarySha256,
    "Raw source binary SHA256 changed",
  );
  const fd = fs.openSync(binaryFile, "r"),
    highAudits = new Map(),
    highPartsSeen = new Map(),
    sourceObjectsChecked = new Set();
  let sourceTriangleTotal = 0,
    previewTriangleTotal = 0,
    highTriangleTotal = 0,
    decodedVertices = 0,
    maxNormalLengthError = 0,
    maxPositionErrorMetres = 0,
    maxNormalErrorDegrees = 0,
    repairedZeroNormals = 0,
    repairedSourceObjects = 0;
  try {
    check(
      fs.fstatSync(fd).size === stage.counts.binaryBytes,
      "Source binary length changed",
    );
    for (const [url, level] of referenced) {
      const file = assetPath(url),
        bytes = fs.readFileSync(file),
        metadata = fileMetadata.get(url);
      check(
        metadata &&
          typeof metadata.sha256 === "string" &&
          metadata.bytes === bytes.length &&
          metadata.sha256 === sha(bytes),
        url + ": missing or mismatched file hash",
      );
      const { gltf, binary } = parseGlb(bytes, url),
        accessor = reader(gltf, binary, url);
      const nodes = gltf.scenes[gltf.scene ?? 0].nodes;
      check(
        nodes.length === gltf.nodes.length &&
          nodes.length === gltf.meshes.length,
        url + ": unexpected hidden or nested nodes",
      );
      for (const nodeIndex of nodes) {
        const node = gltf.nodes[nodeIndex],
          id = node.extras?.structureId,
          mesh = fullById.get(id);
        check(
          mesh && node.name === id && node.extras.level === level,
          url + ": unexpected structure identity or level",
        );
        check(
          !node.children?.length && !node.rotation && !node.matrix,
          id + ": unexpected transform outside shared frame",
        );
        check(node.extras.fmaId == null, id + ": GLB has an unverified FMA");
        check(
          node.extras.sourceObjectName === mesh.sourceObjectName,
          id + ": GLB source identity changed",
        );
        check(
          (node.extras.vascularKind ?? null) === (mesh.vascularKind ?? null),
          id + ": GLB vascular metadata changed",
        );
        const record = byName.get(mesh.sourceObjectName),
          primitives = gltf.meshes[node.mesh].primitives;
        check(primitives.length === 1, id + ": unexpected primitive split");
        const primitive = primitives[0],
          p = accessor(primitive.attributes.POSITION),
          n = accessor(primitive.attributes.NORMAL),
          indices = accessor(primitive.indices);
        check(
          (primitive.mode ?? 4) === 4 &&
            p.type === "VEC3" &&
            n.type === "VEC3" &&
            p.count === n.count &&
            indices.type === "SCALAR" &&
            indices.count % 3 === 0,
          id + ": invalid triangle primitive",
        );
        check(
          [5123, 5126].includes(p.componentType) &&
            n.componentType === 5122 &&
            n.normalized === true,
          id + ": unexpected position or normal format",
        );
        const translation = node.translation || [0, 0, 0],
          scale = node.scale || [1, 1, 1];
        finiteVector(translation, 3, id + ".translation");
        finiteVector(scale, 3, id + ".scale");
        check(
          scale.every((value) => value > 0) &&
            scale[0] === scale[1] &&
            scale[1] === scale[2],
          id + ": nonuniform coordinate scale",
        );
        const sourceGeometry = {
          position: readArray(fd, record.positions),
          normal: readArray(fd, record.normals),
          indices: readArray(fd, record.indices),
          materialIndices: readArray(fd, record.materialIndices),
        };
        const provenance = provenanceById.get(id);
        for (const [key, values] of [
          ["positions", sourceGeometry.position],
          ["normals", sourceGeometry.normal],
          ["indices", sourceGeometry.indices],
          ["materialIndices", sourceGeometry.materialIndices],
        ]) {
          check(
            provenance.attributes[key].sha256 === values.sourceSha256,
            id + ": raw source attribute hash differs",
          );
          check(
            [
              "byteOffset",
              "byteLength",
              "componentType",
              "components",
              "count",
            ].every(
              (field) =>
                provenance.attributes[key][field] === record[key][field],
            ),
            id + ": source attribute range differs",
          );
        }
        const rawNormals = sourceGeometry.normal;
        const repair = repairUndefinedSourceNormals(
          sourceGeometry.position,
          rawNormals,
          sourceGeometry.indices,
        );
        check(
          JSON.stringify(repair.repairedIndices) ===
            JSON.stringify(provenance.normalRepair.repairedCornerIndices) &&
            repair.repairedIndices.length ===
              provenance.normalRepair.repairedCount &&
            repair.method === provenance.normalRepair.method,
          id + ": lighting repair is not documented exactly",
        );
        for (let vertex = 0; vertex < rawNormals.length / 3; vertex++) {
          const at = vertex * 3;
          if (rawNormals[at] || rawNormals[at + 1] || rawNormals[at + 2])
            check(
              [0, 1, 2].every(
                (axis) => rawNormals[at + axis] === repair.normal[at + axis],
              ),
              id + ": valid authored normal was altered",
            );
        }
        if (!sourceObjectsChecked.has(id)) {
          repairedZeroNormals += repair.repairedIndices.length;
          repairedSourceObjects += repair.repairedIndices.length > 0 ? 1 : 0;
          sourceObjectsChecked.add(id);
        }
        sourceGeometry.normal = repair.normal;
        let highAudit = level === "high" ? highAudits.get(id) : undefined;
        if (highAudit)
          check(
            JSON.stringify([
              translation,
              scale,
              p.componentType,
              n.componentType,
            ]) === highAudit.encoding,
            id + ": HIGH chunks use different quantization grids",
          );
        const topology =
            highAudit?.topology ??
            sourceTopology(
              record,
              sourceGeometry,
              p,
              n,
              translation,
              scale,
              level === "high",
            ),
          mapped = new Uint32Array(p.count);
        if (level === "high" && !highAudit) {
          highAudit = {
            topology,
            encoding: JSON.stringify([
              translation,
              scale,
              p.componentType,
              n.componentType,
            ]),
            bounds: {
              min: [Infinity, Infinity, Infinity],
              max: [-Infinity, -Infinity, -Infinity],
            },
          };
          highAudits.set(id, highAudit);
        }
        maxPositionErrorMetres = Math.max(
          maxPositionErrorMetres,
          topology.maxPositionError,
        );
        maxNormalErrorDegrees = Math.max(
          maxNormalErrorDegrees,
          topology.maxNormalErrorDegrees,
        );
        const bounds = {
          min: [Infinity, Infinity, Infinity],
          max: [-Infinity, -Infinity, -Infinity],
        };
        for (let vertex = 0; vertex < p.count; vertex++) {
          const values = [];
          for (let axis = 0; axis < 3; axis++) {
            const value = p.get(vertex, axis);
            check(Number.isFinite(value), id + ": nonfinite position");
            values.push(value);
            const world = value * scale[axis] + translation[axis];
            bounds.min[axis] = Math.min(bounds.min[axis], world);
            bounds.max[axis] = Math.max(bounds.max[axis], world);
          }
          const normal = [];
          for (let axis = 0; axis < 3; axis++) {
            const value = n.get(vertex, axis);
            values.push(value);
            normal.push(Math.max(-1, value / 32767));
          }
          const lengthError = Math.abs(Math.hypot(...normal) - 1);
          maxNormalLengthError = Math.max(maxNormalLengthError, lengthError);
          check(lengthError < 0.001, id + ": invalid authored normal");
          const sourceKey = topology.canonical.get(values.join("|"));
          check(
            sourceKey !== undefined,
            id +
              ": vertex or authored normal is not present in the quantized source geometry",
          );
          mapped[vertex] = sourceKey;
        }
        const triangles = indices.count / 3;
        for (let i = 0; i < indices.count; i += 3) {
          const a = indices.get(i),
            b = indices.get(i + 1),
            c = indices.get(i + 2);
          check(
            a < p.count && b < p.count && c < p.count,
            id + ": index outside vertices",
          );
          if (level === "high") {
            const key = cyclicKey(mapped[a], mapped[b], mapped[c]),
              available = topology.triangles.get(key) || 0;
            check(
              available > 0,
              id + ": HIGH changed source triangles or orientation",
            );
            topology.triangles.set(key, available - 1);
          }
        }
        if (level === "high") {
          for (let axis = 0; axis < 3; axis++) {
            highAudit.bounds.min[axis] = Math.min(
              highAudit.bounds.min[axis],
              bounds.min[axis],
            );
            highAudit.bounds.max[axis] = Math.max(
              highAudit.bounds.max[axis],
              bounds.max[axis],
            );
          }
          const parts = (highPartsSeen.get(id) || 0) + 1;
          highPartsSeen.set(id, parts);
          check(parts <= mesh.lod.files.length, id + ": extra HIGH chunk");
          if (parts === mesh.lod.files.length) {
            check(
              [...topology.triangles.values()].every((count) => count === 0),
              id + ": HIGH lost source triangles",
            );
            compareBounds(
              highAudit.bounds,
              record.bounds,
              POSITION_ERROR + 1e-7,
              id + ".decodedHigh",
            );
            highAudits.delete(id);
          }
          highTriangleTotal += triangles;
        } else {
          check(
            triangles <= record.triangles,
            id + ": preview grew beyond HIGH",
          );
          previewTriangleTotal += triangles;
        }
        seen[level].set(id, (seen[level].get(id) || 0) + triangles);
        decodedVertices += p.count;
      }
      report.files.push({
        url,
        level,
        bytes: bytes.length,
        sha256: sha(bytes),
        structures: nodes.length,
      });
      if (report.files.length % 500 === 0)
        console.log(
          JSON.stringify({
            checkedPrivateFiles: report.files.length,
            total: referenced.size,
          }),
        );
    }
  } finally {
    fs.closeSync(fd);
  }
  sameSet(
    [...seen.high.keys()],
    [...fullById.keys()],
    "Decoded HIGH structures",
  );
  sameSet(
    [...seen.preview.keys()],
    [...fullById.keys()],
    "Decoded preview structures",
  );
  check(highAudits.size === 0, "Incomplete HIGH topology audits");
  check(
    repairedZeroNormals === 230 && repairedSourceObjects === 10,
    "Source zero-normal repair review count changed",
  );
  for (const mesh of full.meshes) {
    check(
      seen.high.get(mesh.id) === mesh.lod.triangles &&
        seen.preview.get(mesh.id) === mesh.triangles,
      mesh.id + ": decoded triangle totals differ from manifest",
    );
    sourceTriangleTotal += byName.get(mesh.sourceObjectName).triangles;
  }
  check(
    sourceTriangleTotal === highTriangleTotal &&
      sourceTriangleTotal === stage.counts.triangles,
    "HIGH total source triangle count changed",
  );
  report.coverage = {
    objects: full.meshes.length,
    arterial: 425,
    venous: 230,
    cardiovascularDisplayObjects,
    otherCardiovascularObjects,
    sourceEvidenceNerveOrBranchObjects: nerveBranches,
    centralNervousStructures: centralStructures,
    nervousDisplayObjects,
    remainingSensorialOrAssociatedObjects:
      nervousDisplayObjects - nerveBranches - centralStructures,
    physicalLicenceExclusions: 206,
    physicalTechnicalExclusions: 59,
    bilateralNerves: requiredNerves,
    bilateralVessels: requiredVessels,
    microscopicCompletenessClaim: false,
  };
  report.geometry = {
    sourceTriangleTotal,
    highTriangleTotal,
    previewTriangleTotal,
    decodedVertices,
    maxNormalLengthError,
    maxPositionErrorMetres,
    maxNormalErrorDegrees,
    repairedZeroNormals,
    repairedSourceObjects,
    highTopologyMatchesSourceAfterDeclaredQuantization: true,
    positionErrorLimitMetres: POSITION_ERROR,
    normalErrorLimitDegrees: NORMAL_ERROR,
    commonCoordinateFrame: stage.coordinateSystem,
  };
  report.status = "passed";
  save();
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks,
      coverage: report.coverage,
      geometry: report.geometry,
      files: report.files.length,
      report: options.report,
    }),
  );
}
try {
  await main();
} catch (error) {
  report.status = "failed";
  report.failures.push(error.stack || String(error));
  save();
  console.error(error.message);
  process.exitCode = 1;
}
