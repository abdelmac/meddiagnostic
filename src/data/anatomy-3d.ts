import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { AnatomySystem } from "./anatomy-structures";

type Point = readonly [number, number, number];
export type AnatomyModel = {
  group: THREE.Group;
  structures: Map<string, THREE.Mesh[]>;
  context: THREE.Mesh[];
  attachments: THREE.Group;
  select: (id?: string, isolate?: boolean, opacity?: number, showAttachments?: boolean) => void;
  dispose: () => void;
};

// Original procedural volumes drawn for MedQuiz, not scanned human anatomy.
// Right/left and anterior/posterior relationships are encoded in world space.
// Dimensions and the attachment markers are schematic, not clinical measurements.
export const anatomyAttachmentPoints: Readonly<Record<string, { origin: Point; insertion: Point }>> = {
  deltoid: { origin: [-0.82, 5.97, 0.02], insertion: [-1.12, 5.27, 0.03] },
  biceps: { origin: [-0.83, 5.88, 0.08], insertion: [-1.32, 4.46, 0.16] },
  triceps: { origin: [-0.8, 5.83, -0.17], insertion: [-1.32, 4.6, -0.12] },
  "pectoralis-major": { origin: [-0.08, 5.55, 0.4], insertion: [-0.99, 5.72, 0.1] },
  "rectus-abdominis": { origin: [-0.16, 3.75, 0.3], insertion: [-0.18, 5.3, 0.38] },
  quadriceps: { origin: [-0.44, 3.65, 0.15], insertion: [-0.46, 1.8, 0.18] },
  diaphragm: { origin: [-0.59, 4.8, -0.07], insertion: [0, 4.98, 0.1] },
};

export const anatomyModelColors = {
  muscles: "#b65a54", skeleton: "#ded4bc", nerves: "#e4bd57", organs: "#a77087", vessels: "#c4554f",
};

/** Create a GPU-independent scene graph; the browser owns its renderer and camera. */
export function buildAnatomyModel(system: AnatomySystem): AnatomyModel {
  const group = new THREE.Group();
  const structures = new Map<string, THREE.Mesh[]>();
  const context: THREE.Mesh[] = [];
  const attachments = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const sphereGeometry = new THREE.SphereGeometry(1, 24, 18);
  geometries.add(sphereGeometry);
  const color = anatomyModelColors[system];
  function material(hex: string, opacity = 1) {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.57, metalness: 0.03,
      transparent: opacity < 1, opacity, depthWrite: opacity >= 0.5, side: THREE.DoubleSide });
    materials.add(mat);
    return mat;
  }
  function add(geometry: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, id?: string, parent = group) {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.userData = { structureId: id, baseColor: mat.color.getHex(), baseOpacity: mat.opacity };
    parent.add(mesh);
    if (id) { const previous = structures.get(id) ?? []; previous.push(mesh); structures.set(id, previous); }
    else if (parent === group) context.push(mesh);
    return mesh;
  }
  function ellipsoid(at: Point, scale: Point, mat: THREE.MeshStandardMaterial, id?: string, parent = group) {
    const mesh = add(sphereGeometry, mat, id, parent);
    mesh.position.set(...at); mesh.scale.set(...scale);
    return mesh;
  }
  function tube(points: readonly Point[], radius: number, mat: THREE.MeshStandardMaterial, id?: string, parent = group) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return add(new THREE.TubeGeometry(curve, Math.max(8, points.length * 8), radius, 8, false), mat, id, parent);
  }
  const mirror = (p: Point, side: number): Point => [p[0] * side, p[1], p[2]];
  function pairedTube(points: readonly Point[], radius: number, mat: THREE.MeshStandardMaterial, id?: string) {
    for (const side of [-1, 1]) tube(points.map((p) => mirror(p, side)), radius, mat, id);
  }
  function between(from: Point, to: Point, width: number, depth: number, mat: THREE.MeshStandardMaterial, id?: string) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const mesh = ellipsoid(a.clone().add(b).multiplyScalar(0.5).toArray() as unknown as Point,
      [width, a.distanceTo(b) / 2, depth], mat, id);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return mesh;
  }
  function pairedBone(id: string | undefined, from: Point, to: Point, radius: number, mat: THREE.MeshStandardMaterial) {
    for (const side of [-1, 1]) {
      const a = mirror(from, side), b = mirror(to, side);
      between(a, b, radius, radius * 0.9, mat, id);
      ellipsoid(a, [radius * 1.55, radius * 1.4, radius * 1.4], mat, id);
      ellipsoid(b, [radius * 1.5, radius * 1.25, radius * 1.35], mat, id);
    }
  }
  const bone = material(anatomyModelColors.skeleton, system === "skeleton" ? 1 : system === "muscles" ? 0.33 : 0.13);
  const joint = material("#9caea9", system === "skeleton" ? 0.65 : 0.1);
  const muscle = material(color);
  const muscleDark = material("#8b3e40");
  const tendon = material("#dfc8ae");
  const fiber = material("#e89984", 0.46);
  const activeBoneId = (id: string) => system === "skeleton" ? id : undefined;

  function loft(sections: readonly { y: number; width: number; depth: number; z?: number }[], mat: THREE.MeshStandardMaterial) {
    const vertices: number[] = [], indices: number[] = [], count = 40;
    for (const section of sections) for (let i = 0; i <= count; i++) {
      const angle = i / count * Math.PI * 2;
      vertices.push(Math.cos(angle) * section.width, section.y, Math.sin(angle) * section.depth + (section.z ?? 0));
    }
    for (let row = 0; row < sections.length - 1; row++) for (let i = 0; i < count; i++) {
      const a = row * (count + 1) + i, b = a + count + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return add(geometry, mat);
  }

  // Skeleton context: skull, individual vertebrae, rib cage, hands and feet.
  if (system !== "muscles") {
    ellipsoid([0, 6.94, -0.02], [0.35, 0.44, 0.29], bone);
    ellipsoid([0, 6.68, 0.08], [0.255, 0.19, 0.23], bone);
  }
  if (system === "skeleton") {
    const socket = material("#344b4b");
    for (const side of [-1, 1]) ellipsoid([side * 0.14, 6.96, 0.247], [0.085, 0.073, 0.035], socket);
    ellipsoid([0, 6.83, 0.27], [0.044, 0.07, 0.018], socket);
    for (let i = -3; i <= 3; i++) ellipsoid([i * 0.045, 6.66, 0.25], [0.019, 0.044, 0.025], bone);
  }
  for (let i = 0; i < 24; i++) {
    const y = 6.4 - i * 0.107;
    const z = -0.115 - 0.06 * Math.sin(i / 5);
    ellipsoid([0, y, z], [0.115, 0.045, 0.1], bone);
    ellipsoid([0, y, z - 0.1], [0.045, 0.035, 0.07], bone);
  }
  pairedTube([[0.04, 5.9, 0.24], [0.35, 5.94, 0.22], [0.7, 5.89, 0.11], [0.86, 5.88, 0]], 0.041, bone, activeBoneId("clavicle"));
  for (let i = 0; i < (system === "muscles" ? 0 : 10); i++) {
    const y = 5.76 - i * 0.095;
    const width = 0.49 + Math.sin(i / 3.8) * 0.2;
    pairedTube([[0.04, y, -0.18], [width * 0.82, y + 0.05, -0.16], [width, y - 0.04, 0.08],
      [width * 0.75, y - 0.11, 0.31], [0.04, y - 0.08, 0.35]], 0.025, bone);
  }
  if (system !== "muscles") between([0, 5.84, 0.35], [0, 4.96, 0.35], 0.065, 0.027, bone);
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0.3 * side, 5.79); shape.lineTo(0.8 * side, 5.79);
    shape.quadraticCurveTo(0.9 * side, 5.52, 0.39 * side, 5.2); shape.closePath();
    const scapula = add(new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.035, bevelSegments: 2, steps: 1 }), bone, activeBoneId("scapula"));
    scapula.position.z = -0.27;
  }
  pairedBone(activeBoneId("humerus"), [0.88, 5.73, 0], [1.29, 4.62, 0], 0.063, bone);
  pairedBone(activeBoneId("radius"), [1.37, 4.56, 0.035], [1.67, 3.45, 0.08], 0.037, bone);
  pairedBone(activeBoneId("ulna"), [1.26, 4.58, -0.02], [1.56, 3.46, -0.01], 0.038, bone);
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.4, 3.62, -0.07], [0.33, 0.4, 0.18], bone, activeBoneId("pelvis"));
    tube([[side * 0.46, 3.62, 0.04], [side * 0.4, 3.25, 0.19], [side * 0.13, 3.33, 0.17], [0, 3.5, 0.13]], 0.055, bone, activeBoneId("pelvis"));
    ellipsoid([side * 0.46, 1.99, 0.13], [0.095, 0.115, 0.055], bone, activeBoneId("patella"));
    ellipsoid([side * 1.63, 3.31, 0.03], [0.105, 0.14, 0.055], bone);
    for (let f = 0; f < 5; f++) {
      const x = side * (1.56 + f * 0.045), y = 3.25 - Math.sin((f + 1) / 6 * Math.PI) * 0.08;
      tube([[x, y, 0.04], [x + side * 0.035, y - 0.13, 0.04], [x + side * 0.04, y - 0.24 + Math.abs(f - 2) * 0.02, 0.05]], 0.016, bone);
    }
    ellipsoid([side * 0.43, 0.14, 0.13], [0.12, 0.12, 0.27], bone);
    for (let f = 0; f < 5; f++) between([side * (0.36 + f * 0.045), 0.1, 0.19], [side * (0.36 + f * 0.045), 0.09, 0.43 - f * 0.035], 0.02, 0.02, bone);
  }
  pairedBone(activeBoneId("femur"), [0.43, 3.51, 0], [0.44, 2.1, 0], 0.082, bone);
  pairedBone(activeBoneId("tibia"), [0.44, 1.88, 0.025], [0.42, 0.4, 0], 0.059, bone);
  pairedBone(undefined, [0.57, 1.88, -0.035], [0.54, 0.38, -0.015], 0.027, bone);
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.44, 2.02, 0], [0.12, 0.065, 0.095], joint);
    ellipsoid([side * 1.31, 4.61, 0], [0.08, 0.08, 0.075], joint);
  }

  function fusiform(id: string | undefined, from: Point, to: Point, width: number, depth: number, mat = muscle) {
    for (const side of [-1, 1]) {
      const a = mirror(from, side), b = mirror(to, side);
      const belly = between(a, b, width, depth, mat, id);
      const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
      const start = new THREE.Vector3(...a).addScaledVector(direction, -0.055);
      const end = new THREE.Vector3(...b).addScaledVector(direction, 0.06);
      tube([start.toArray() as unknown as Point, a], Math.min(0.027, width / 4), tendon, id);
      tube([b, end.toArray() as unknown as Point], Math.min(0.027, width / 4), tendon, id);
      // Fine surface bundles follow the long axis instead of a flat texture.
      for (let n = -2; n <= 2; n++) {
        const points: Point[] = [];
        for (let j = 0; j < 9; j++) {
          const t = -0.83 + j / 8 * 1.66;
          const breadth = Math.sqrt(1 - t * t);
          const local = new THREE.Vector3(n / 3 * width * breadth, t * direction.length() / 2, depth * breadth * Math.sqrt(1 - (n / 3) ** 2) + 0.003);
          local.applyQuaternion(belly.quaternion).add(belly.position);
          points.push(local.toArray() as unknown as Point);
        }
        tube(points, 0.0035, fiber, id);
      }
    }
  }
  if (system === "muscles") {
    // A continuous trunk and tendon sheaths join the individual study volumes.
    // This is deliberately an original simplified surface, not a photoreal atlas.
    const foundation = material("#99514d");
    loft([
      { y: 3.36, width: 0.24, depth: 0.19 }, { y: 3.53, width: 0.54, depth: 0.26 },
      { y: 3.83, width: 0.56, depth: 0.28 }, { y: 4.14, width: 0.46, depth: 0.26 },
      { y: 4.55, width: 0.48, depth: 0.27 }, { y: 4.88, width: 0.6, depth: 0.29 },
      { y: 5.2, width: 0.67, depth: 0.29 }, { y: 5.56, width: 0.71, depth: 0.27 },
      { y: 5.84, width: 0.73, depth: 0.18 }, { y: 6.02, width: 0.37, depth: 0.16 },
      { y: 6.26, width: 0.21, depth: 0.15 }, { y: 6.55, width: 0.18, depth: 0.15 },
    ], foundation);
    const headContext = material("#b7b2a0");
    ellipsoid([0, 6.98, -0.04], [0.32, 0.4, 0.27], headContext);
    ellipsoid([0, 6.7, 0.015], [0.215, 0.15, 0.19], headContext);
    ellipsoid([0, 6.86, 0.25], [0.049, 0.086, 0.06], headContext);
    const eye = material("#6c7064");
    for (const side of [-1, 1]) {
      ellipsoid([side * 0.13, 6.98, 0.214], [0.074, 0.04, 0.038], eye);
      ellipsoid([side * 0.3, 6.88, -0.01], [0.04, 0.09, 0.055], headContext);
      between([side * 0.08, 6.51, 0.11], [side * 0.31, 6.01, 0.13], 0.05, 0.045, muscleDark);
      between([side * 0.89, 5.72, -0.015], [side * 1.3, 4.65, 0], 0.14, 0.13, foundation);
      between([side * 1.34, 4.58, 0], [side * 1.6, 3.43, 0.01], 0.075, 0.075, foundation);
      between([side * 0.44, 3.54, 0], [side * 0.44, 2.03, 0], 0.23, 0.19, foundation);
      between([side * 0.46, 1.94, -0.015], [side * 0.43, 0.37, 0], 0.105, 0.1, foundation);
      ellipsoid([side * 1.63, 3.31, 0.025], [0.105, 0.14, 0.048], tendon);
      ellipsoid([side * 0.43, 0.14, 0.12], [0.12, 0.1, 0.24], tendon);
    }
    // Shoulder caps, pectoral fans, fusiform limbs and abdominal segments.
    fusiform("deltoid", [0.79, 5.98, 0.005], [1.12, 5.27, 0.02], 0.245, 0.21);
    fusiform("biceps", [1.005, 5.57, 0.155], [1.25, 4.76, 0.14], 0.148, 0.125);
    fusiform("triceps", [0.98, 5.59, -0.145], [1.28, 4.72, -0.1], 0.17, 0.14, muscleDark);
    for (const side of [-1, 1]) {
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [], indices: number[] = [];
      // An extruded convex fan converges towards the proximal humeral insertion.
      const outline: Point[] = [[0.05, 5.83, 0.32], [0.38, 5.9, 0.33], [0.82, 5.88, 0.23], [0.99, 5.68, 0.14], [0.6, 5.3, 0.38], [0.08, 5.35, 0.41]];
      const center: Point = [0.48, 5.62, 0.46];
      vertices.push(...mirror(center, side));
      outline.forEach((p) => vertices.push(...mirror(p, side)));
      for (let i = 1; i <= outline.length; i++) indices.push(0, i, i === outline.length ? 1 : i + 1);
      const back = outline.length + 1;
      vertices.push(...mirror([center[0], center[1], center[2] - 0.15], side));
      outline.forEach((p) => vertices.push(...mirror([p[0], p[1], p[2] - 0.1], side)));
      for (let i = 1; i <= outline.length; i++) {
        const next = i === outline.length ? 1 : i + 1;
        indices.push(back, back + next, back + i, i, back + i, next, next, back + i, back + next);
      }
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      add(geometry, muscle, "pectoralis-major");
      for (let i = 0; i < 8; i++) tube([[side * 0.08, 5.38 + i * 0.058, 0.415], [side * 0.49, 5.52 + i * 0.028, 0.46], [side * 0.95, 5.69, 0.17]], 0.004, fiber, "pectoralis-major");
      between([side * 0.165, 5.23, 0.29], [side * 0.15, 4.1, 0.27], 0.145, 0.06, muscle, "rectus-abdominis");
      for (let i = 0; i < 4; i++) ellipsoid([side * 0.165, 5.12 - i * 0.27, 0.3 - i * 0.006], [0.145, 0.145, 0.052], muscle, "rectus-abdominis");
      between([side * 0.15, 4.16, 0.32], [side * 0.1, 3.73, 0.28], 0.13, 0.07, muscle, "rectus-abdominis");
      // Contextual surface muscles supply the overall human silhouette.
      ellipsoid([side * 0.43, 3.59, -0.2], [0.32, 0.37, 0.21], muscleDark);
      between([side * 0.27, 6.05, -0.16], [side * 0.64, 5.38, -0.28], 0.24, 0.1, muscleDark);
      between([side * 0.5, 5.22, -0.28], [side * 0.33, 4.14, -0.24], 0.24, 0.13, muscleDark);
      between([side * 0.46, 4.97, 0.12], [side * 0.48, 3.91, 0.11], 0.155, 0.18, muscleDark);
      between([side * 0.43, 3.39, -0.15], [side * 0.46, 2.2, -0.15], 0.19, 0.14, muscleDark);
    }
    fusiform("quadriceps", [0.44, 3.57, 0.15], [0.44, 2.12, 0.15], 0.24, 0.17);
    fusiform("quadriceps", [0.57, 3.4, 0.1], [0.53, 2.12, 0.1], 0.12, 0.14);
    fusiform("quadriceps", [0.3, 3.38, 0.12], [0.34, 2.12, 0.12], 0.105, 0.13);
    fusiform(undefined, [1.38, 4.49, 0.09], [1.61, 3.57, 0.075], 0.11, 0.095, muscleDark);
    fusiform(undefined, [0.46, 1.86, -0.125], [0.46, 0.63, -0.1], 0.17, 0.14, muscleDark);
    fusiform(undefined, [0.48, 1.8, 0.075], [0.43, 0.46, 0.08], 0.087, 0.07);
    // Diaphragm: low dome, visible through the schematic rib cage in isolation.
    const dome = add(new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), material("#d58a78"), "diaphragm");
    dome.position.set(0, 4.79, 0); dome.scale.set(0.64, 0.27, 0.36);
  }

  if (system === "nerves") {
    const nerve = material(color);
    tube([[0, 6.48, -0.14], [0, 5.5, -0.17], [0, 4.5, -0.15], [0, 4.05, -0.12]], 0.043, nerve, "spinal-cord");
    for (let i = 0; i < 16; i++) pairedTube([[0, 6.1 - i * 0.12, -0.16], [0.13, 6.05 - i * 0.12, -0.12], [0.2, 6 - i * 0.12, -0.04]], 0.012, nerve, "spinal-cord");
    for (let i = 0; i < 5; i++) pairedTube([[0.1, 6.29 - i * 0.065, -0.1], [0.42, 5.99 - i * 0.02, 0.04], [0.83, 5.76, 0.04]], 0.018, nerve, "brachial-plexus");
    pairedTube([[0.83, 5.76, 0.08], [1.09, 5.1, 0.12], [1.31, 4.55, 0.13], [1.52, 3.84, 0.12], [1.61, 3.3, 0.1]], 0.021, nerve, "median-nerve");
    pairedTube([[0.85, 5.75, 0], [1.04, 5.08, -0.02], [1.23, 4.6, -0.08], [1.42, 4.14, 0.03], [1.54, 3.3, 0.08]], 0.019, nerve, "ulnar-nerve");
    pairedTube([[0.85, 5.75, -0.08], [1, 5.15, -0.11], [1.33, 4.7, -0.08], [1.47, 4.13, -0.05], [1.65, 3.42, 0]], 0.022, nerve, "radial-nerve");
    pairedTube([[0.13, 4.06, -0.1], [0.42, 3.49, -0.21], [0.46, 2.75, -0.19], [0.45, 2.01, -0.15]], 0.036, nerve, "sciatic-nerve");
    pairedTube([[0.1, 4.36, -0.07], [0.32, 3.92, 0.03], [0.49, 3.4, 0.17], [0.48, 2.8, 0.17]], 0.026, nerve, "femoral-nerve");
    pairedTube([[0.45, 2.02, -0.15], [0.47, 1.5, -0.16], [0.44, 0.7, -0.14], [0.43, 0.25, -0.08], [0.43, 0.1, 0.32]], 0.025, nerve, "tibial-nerve");
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      tube([[side * 1.59, 3.35, 0.1], [side * (1.53 + i * 0.07), 3.06, 0.1]], 0.009, nerve, "median-nerve");
      tube([[side * 0.48, 3.37, 0.17], [side * (0.35 + i * 0.1), 2.64, 0.18]], 0.012, nerve, "femoral-nerve");
    }
  }
  if (system === "organs") {
    const heartMat = material("#b45160");
    const heart = ellipsoid([0.18, 5.32, 0.12], [0.18, 0.28, 0.16], heartMat, "heart"); heart.rotation.z = 0.38;
    ellipsoid([0.1, 5.49, 0.14], [0.15, 0.13, 0.13], heartMat, "heart");
    const lung = material("#b291a7");
    for (const side of [-1, 1]) {
      ellipsoid([side * 0.4, 5.43, -0.015], [0.25, 0.48, 0.23], lung, "lungs");
      tube([[side * 0.13, 5.64, 0.07], [side * 0.33, 5.45, 0.11], [side * 0.43, 5.2, 0.12]], 0.024, material("#d7c2b7"), "lungs");
    }
    tube([[0, 6.21, 0.06], [0, 5.9, 0.05], [0, 5.67, 0.06]], 0.055, material("#d2c7b4"));
    const liver = ellipsoid([-0.19, 4.87, 0.11], [0.43, 0.2, 0.24], material("#8d4f4a"), "liver"); liver.rotation.z = -0.14;
    const stomach = ellipsoid([0.29, 4.66, 0.13], [0.19, 0.3, 0.19], material("#c6818d"), "stomach"); stomach.rotation.z = -0.5;
    tube([[0.13, 5.12, 0], [0.16, 4.87, 0], [0.24, 4.77, 0.1]], 0.044, material("#c6818d"), "stomach");
    for (const side of [-1, 1]) { const kidney = ellipsoid([side * 0.34, 4.55 + side * 0.04, -0.15], [0.12, 0.21, 0.1], material("#a34f5d"), "kidneys"); kidney.rotation.z = side * 0.2; }
    ellipsoid([0, 3.6, 0.1], [0.19, 0.19, 0.15], material("#c5a0a0"), "bladder");
    for (const side of [-1, 1]) tube([[side * 0.3, 4.4, -0.1], [side * 0.22, 4, -0.08], [side * 0.09, 3.67, 0.08]], 0.013, material("#d9bdb0"));
    // Unlabelled intestinal context; no fabricated selectable structures.
    const gut = material("#a88691", 0.55);
    for (let i = 0; i < 4; i++) tube([[-0.31, 4.28 - i * 0.12, 0.12], [-0.1, 4.34 - i * 0.12, 0.18], [0.21, 4.27 - i * 0.12, 0.18], [0.32, 4.2 - i * 0.12, 0.1]], 0.043, gut);
  }
  if (system === "vessels") {
    const artery = material("#c65b55"), vein = material("#6499b1");
    tube([[0.1, 5.35, 0.14], [0.13, 5.73, 0.15], [0.37, 5.78, 0], [0.17, 5.42, -0.05], [0.11, 4.6, -0.02], [0.08, 3.7, -0.02]], 0.063, artery, "aorta");
    pairedTube([[0.08, 3.7, -0.02], [0.32, 3.48, 0.07], [0.47, 3.25, 0.12]], 0.039, artery, "aorta");
    pairedTube([[0.17, 5.74, 0.13], [0.19, 6.08, 0.11], [0.2, 6.42, 0.08]], 0.027, artery, "carotid");
    pairedTube([[0.17, 5.74, 0.1], [0.44, 5.89, 0.15], [0.72, 5.87, 0.08], [0.87, 5.66, 0.05]], 0.033, artery, "subclavian-artery");
    pairedTube([[0.47, 3.3, 0.12], [0.46, 2.7, 0.16], [0.44, 2.05, 0.06]], 0.033, artery, "femoral-artery");
    tube([[-0.16, 5.31, -0.04], [-0.14, 4.75, -0.02], [-0.12, 4.1, -0.02], [-0.09, 3.68, -0.02]], 0.058, vein, "inferior-vena-cava");
    pairedTube([[-0.09, 3.68, -0.02], [0.3, 3.46, -0.03], [0.44, 3.26, 0.03]], 0.043, vein, "inferior-vena-cava");
    tube([[0.13, 5.35, 0.25], [0.1, 5.58, 0.25], [-0.1, 5.63, 0.18], [-0.4, 5.57, 0.1]], 0.047, vein, "pulmonary-artery");
    tube([[0.1, 5.58, 0.25], [0.27, 5.64, 0.12], [0.44, 5.57, 0.1]], 0.037, vein, "pulmonary-artery");
    for (const side of [-1, 1]) {
      tube([[side * 0.87, 5.67, 0.05], [side * 1.28, 4.62, 0.09], [side * 1.59, 3.44, 0.09]], 0.022, artery);
      tube([[side * 0.44, 2.05, 0.06], [side * 0.46, 1.2, -0.08], [side * 0.44, 0.23, 0.03]], 0.021, artery);
    }
  }
  // A faint enclosing silhouette reinforces the overall spatial reference.
  if (system !== "muscles") {
    const ghost = material("#8faaa4", 0.045);
    ellipsoid([0, 5.17, 0], [0.7, 0.92, 0.38], ghost);
    ellipsoid([0, 4.19, 0], [0.5, 0.62, 0.3], ghost);
    for (const side of [-1, 1]) {
      between([side * 0.88, 5.76, 0], [side * 1.3, 4.64, 0], 0.2, 0.18, ghost);
      between([side * 0.43, 3.58, 0], [side * 0.44, 2.03, 0], 0.28, 0.24, ghost);
    }
  }
  // Bake transforms and batch volumes by material. Structure IDs remain separate
  // for ray casting and isolation, while mobile GPUs issue far fewer draw calls.
  function batch(meshes: THREE.Mesh[], id?: string) {
    const byMaterial = new Map<string, THREE.Mesh[]>();
    meshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const key = `${mat.uuid}:${mesh.geometry.index ? "indexed" : "plain"}`;
      const list = byMaterial.get(key) ?? []; list.push(mesh); byMaterial.set(key, list);
    });
    const result: THREE.Mesh[] = [];
    byMaterial.forEach((list) => {
      const baked = list.map((mesh) => {
        mesh.updateMatrix();
        const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrix);
        Object.keys(geometry.attributes).filter((attribute) => attribute !== "position" && attribute !== "normal").forEach((attribute) => geometry.deleteAttribute(attribute));
        return geometry;
      });
      const merged = mergeGeometries(baked);
      baked.forEach((geometry) => geometry.dispose());
      if (!merged) { result.push(...list); return; }
      geometries.add(merged);
      const mesh = new THREE.Mesh(merged, list[0]!.material);
      mesh.userData = { ...list[0]!.userData, structureId: id };
      list.forEach((previous) => group.remove(previous)); group.add(mesh); result.push(mesh);
    });
    return result;
  }
  const batchedContext = batch(context);
  context.splice(0, context.length, ...batchedContext);
  structures.forEach((meshes, id) => structures.set(id, batch(meshes, id)));
  group.add(attachments);
  const originMat = material("#78c8f5"), insertionMat = material("#f4b072");
  const originMarker = ellipsoid([0, 0, 0], [0.063, 0.063, 0.063], originMat, undefined, attachments);
  const insertionMarker = ellipsoid([0, 0, 0], [0.063, 0.063, 0.063], insertionMat, undefined, attachments);
  // A halo remains distinguishable from the muscle highlight under low contrast.
  for (const marker of [originMarker, insertionMarker]) {
    marker.renderOrder = 10;
    const mat = marker.material as THREE.MeshStandardMaterial;
    mat.depthTest = false; mat.emissive.copy(mat.color); mat.emissiveIntensity = 0.2;
  }
  function select(id?: string, isolate = false, opacity = 1, showAttachments = false) {
    const safeOpacity = Number.isFinite(opacity) ? THREE.MathUtils.clamp(opacity, 0.15, 1) : 1;
    const knownSelection = !!id && structures.has(id);
    structures.forEach((meshes, structureId) => meshes.forEach((mesh) => {
      const selected = knownSelection && structureId === id;
      mesh.visible = !isolate || !knownSelection || selected;
      // Clone on first selection; meshes initially share materials for efficient creation.
      if (!mesh.userData.ownMaterial) {
        mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone();
        materials.add(mesh.material); mesh.userData.ownMaterial = true;
      }
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(selected ? 0xe7ac65 : mesh.userData.baseColor as number);
      mat.emissive.setHex(selected ? 0x6e3b12 : 0x000000);
      mat.emissiveIntensity = selected ? 0.17 : 0;
      mat.opacity = selected ? 1 : (mesh.userData.baseOpacity as number) * safeOpacity;
      mat.transparent = mat.opacity < 1; mat.depthWrite = mat.opacity >= 0.5;
    }));
    context.forEach((mesh) => {
      mesh.visible = !isolate || !knownSelection;
      if (!mesh.userData.ownMaterial) {
        mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone();
        materials.add(mesh.material); mesh.userData.ownMaterial = true;
      }
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = (mesh.userData.baseOpacity as number) * safeOpacity;
      mat.transparent = mat.opacity < 1; mat.depthWrite = mat.opacity >= 0.5;
    });
    const points = id ? anatomyAttachmentPoints[id] : undefined;
    attachments.visible = showAttachments && !!points && system === "muscles";
    if (points) { originMarker.position.set(...points.origin); insertionMarker.position.set(...points.insertion); }
  }
  select();
  return { group, structures, context, attachments, select, dispose: () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
    group.clear();
  } };
}
