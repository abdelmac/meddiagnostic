import { MeshoptEncoder } from 'meshoptimizer';

// Existing, tested Ippomed encoding, shared without importing a data downloader.
// HIGH keeps source triangles; only the caller creates a simplified preview.
export function createAnatomyGltfEncoder({ attribution, generator = 'Ippomed anatomy importer', positionErrorMetres = 0.00002, normalErrorDegrees = 1 }) {
const ATTRIBUTION = attribution, GENERATOR = generator;
const POSITION_ERROR = positionErrorMetres, NORMAL_ERROR_DEGREES = normalErrorDegrees;
const align = value => (value + 3) & ~3;
const colors = { skeleton: [0.82,0.78,0.66,1], muscles: [0.64,0.22,0.2,1], organs: [0.63,0.34,0.36,1], nerves: [0.9,0.73,0.28,1], vessels: [0.76,0.16,0.2,1] };
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
      if (!Number.isInteger(q) || q < 0 || q > 65535)
        throw Error("Position quantization falls outside its declared source bounds");
      position[i * 4 + a] = q;
      if (position[i * 4 + a] !== q)
        throw Error("Stored position quantization differs from its checked value");
      distance += (position[i * 4 + a] * scale + translation[a] - value) ** 2;
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
      generator: GENERATOR,
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
        sourceVersion: mesh.sourceVersion,
        sourceObjectName: mesh.sourceObjectName,
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


return { quantization, selectVertices, makeGlb };
}
