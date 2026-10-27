import test from "node:test";
import assert from "node:assert/strict";
import { anatomySectionContainsPoint, anatomySectionIntersectsBounds, anatomySectionPlane, normalizeAnatomySection } from "../src/domain/anatomy-section";

const bounds = { min: [-0.4, 0, -0.2], max: [0.4, 1.8, 0.3] };

test("virtual sections validate bounded JSON and copy only rendering state", () => {
  assert.deepEqual(normalizeAnatomySection({ axis: "axial", position: 0.5, inverted: false, account: "never-copy" }), { axis: "axial", position: 0.5, inverted: false });
  for (const value of [null, [], "axial", {}, { axis: "oblique", position: 0.5, inverted: false }, { axis: "axial", position: "0.5", inverted: false }, { axis: "axial", position: Infinity, inverted: false }, { axis: "axial", position: NaN, inverted: false }, { axis: "axial", position: -0.01, inverted: false }, { axis: "axial", position: 1.01, inverted: false }, { axis: "axial", position: 0.5, inverted: "false" }]) assert.equal(normalizeAnatomySection(value), undefined);
});

test("sections retain the correct source half-space for each anatomical axis", () => {
  for (const [axis, coordinateIndex] of [["axial", 1], ["sagittal", 0], ["coronal", 2]] as const) {
    const plane = anatomySectionPlane({ axis, position: 0.4, inverted: false }, bounds)!;
    const above = [0, 0.9, 0.05], below = [...above], onPlane = [...above];
    above[coordinateIndex] = plane.coordinate + 0.02;
    below[coordinateIndex] = plane.coordinate - 0.02;
    onPlane[coordinateIndex] = plane.coordinate;
    assert(anatomySectionContainsPoint(plane, above));
    assert(!anatomySectionContainsPoint(plane, below));
    assert(anatomySectionContainsPoint(plane, onPlane));
    const inverse = anatomySectionPlane({ axis, position: 0.4, inverted: true }, bounds)!;
    assert(!anatomySectionContainsPoint(inverse, above));
    assert(anatomySectionContainsPoint(inverse, below));
    assert(anatomySectionContainsPoint(inverse, onPlane));
    assert.equal(inverse.coordinate, plane.coordinate);
  }
});

test("end sections align with the source bounds and invalid bounds never create a GPU plane", () => {
  assert.equal(anatomySectionPlane({ axis: "axial", position: 0, inverted: false }, bounds)!.coordinate, 0);
  assert.equal(anatomySectionPlane({ axis: "axial", position: 1, inverted: false }, bounds)!.coordinate, 1.8);
  for (const invalid of [{ min: [], max: [] }, { min: [0, NaN, 0], max: [1, 2, 1] }, { min: [0, 2, 0], max: [1, 1, 1] }]) assert.equal(anatomySectionPlane({ axis: "axial", position: 0.5, inverted: false }, invalid), undefined);
  assert.equal(anatomySectionPlane(undefined, bounds), undefined);
  assert(!anatomySectionContainsPoint(undefined, [0, Infinity, 0]));
  assert(anatomySectionContainsPoint(undefined, [0, 0, 0]));
});

test("section detail eligibility skips only wholly removed source bounds", () => {
  const plane = anatomySectionPlane({ axis: "axial", position: 0.5, inverted: false }, bounds)!;
  const lower = { min: [-0.1, 0.1, 0], max: [0.1, 0.8, 0.1] };
  const crossing = { min: [-0.1, 0.8, 0], max: [0.1, 1, 0.1] };
  const upper = { min: [-0.1, 1, 0], max: [0.1, 1.2, 0.1] };
  assert(!anatomySectionIntersectsBounds(plane, lower));
  assert(anatomySectionIntersectsBounds(plane, crossing));
  assert(anatomySectionIntersectsBounds(plane, upper));
  const inverse = anatomySectionPlane({ axis: "axial", position: 0.5, inverted: true }, bounds)!;
  assert(anatomySectionIntersectsBounds(inverse, lower));
  assert(anatomySectionIntersectsBounds(inverse, crossing));
  assert(!anatomySectionIntersectsBounds(inverse, upper));
  assert(anatomySectionIntersectsBounds(plane, { min: [], max: [] }));
});
