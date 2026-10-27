/** A virtual section through the same, already normalised anatomical reference.
 * This clips source surfaces; it does not invent a solid tissue cross-section. */
export type AnatomySection = {
  axis: "axial" | "sagittal" | "coronal";
  position: number;
  inverted: boolean;
};

export type AnatomySectionBounds = {
  min: readonly number[];
  max: readonly number[];
};

export type AnatomySectionPlane = {
  normal: [number, number, number];
  constant: number;
  coordinate: number;
};

/** Copies only the three public rendering fields, never arbitrary bridge data. */
export function normalizeAnatomySection(value: unknown): AnatomySection | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Partial<AnatomySection>;
  if (candidate.axis !== "axial" && candidate.axis !== "sagittal" && candidate.axis !== "coronal") return undefined;
  if (typeof candidate.position !== "number" || !Number.isFinite(candidate.position) || candidate.position < 0 || candidate.position > 1) return undefined;
  if (typeof candidate.inverted !== "boolean") return undefined;
  return { axis: candidate.axis, position: candidate.position, inverted: candidate.inverted };
}

/** World axes: X left/right, Y inferior/superior, Z posterior/anterior.
 * As in THREE.Plane, the nonnegative half-space is the side kept visible. */
export function anatomySectionPlane(
  section: AnatomySection | undefined,
  bounds: AnatomySectionBounds,
): AnatomySectionPlane | undefined {
  const valid = normalizeAnatomySection(section);
  if (!valid || bounds.min.length !== 3 || bounds.max.length !== 3) return undefined;
  if (bounds.min.some((min, axis) => !Number.isFinite(min) || !Number.isFinite(bounds.max[axis]) || min > bounds.max[axis]!)) return undefined;
  const axis = valid.axis === "axial" ? 1 : valid.axis === "sagittal" ? 0 : 2;
  const coordinate = bounds.min[axis]! + (bounds.max[axis]! - bounds.min[axis]!) * valid.position;
  const direction = valid.inverted ? -1 : 1;
  const normal: [number, number, number] = [0, 0, 0];
  normal[axis] = direction;
  return { normal, constant: -coordinate * direction, coordinate };
}

/** Ray intersections must respect the same half-space as the clipped renderer. */
export function anatomySectionContainsPoint(
  plane: AnatomySectionPlane | undefined,
  point: readonly number[],
): boolean {
  if (point.length !== 3 || point.some((value) => !Number.isFinite(value))) return false;
  if (!plane) return true;
  const distance = plane.normal.reduce((sum, component, axis) => sum + component * point[axis]!, plane.constant);
  return Number.isFinite(distance) && distance >= -0.000001;
}

/** Keep partly cut structures eligible for detail; skip only a whole AABB on
 * the discarded side. Invalid source bounds conservatively remain eligible. */
export function anatomySectionIntersectsBounds(
  plane: AnatomySectionPlane | undefined,
  bounds: AnatomySectionBounds,
): boolean {
  if (!plane) return true;
  if (bounds.min.length !== 3 || bounds.max.length !== 3 || bounds.min.some((min, axis) => !Number.isFinite(min) || !Number.isFinite(bounds.max[axis]) || min > bounds.max[axis]!)) return true;
  const farthestDistance = plane.normal.reduce((sum, component, axis) => sum + component * (component >= 0 ? bounds.max[axis]! : bounds.min[axis]!), plane.constant);
  return !Number.isFinite(farthestDistance) || farthestDistance >= -0.000001;
}
