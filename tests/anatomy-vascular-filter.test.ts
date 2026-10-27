import test from "node:test";
import assert from "node:assert/strict";
import {
  anatomyExcludedVesselIds,
  type AnatomyMesh,
  type AnatomyVascularKind,
} from "../src/data/anatomy-catalog";
import type { AnatomySystem } from "../src/data/anatomy-structures";

const mesh = (
  id: string,
  system: AnatomySystem,
  vascularKind?: AnatomyVascularKind,
  name = id,
): AnatomyMesh => ({
  id,
  fmaId: id,
  elementId: id,
  representationId: id,
  name,
  system,
  legacyIds: [],
  ...(vascularKind ? { vascularKind } : {}),
});
const meshes = [
  mesh("FMA1", "vessels", "artery", "pulmonary artery"),
  mesh("FMA2", "vessels", "vein", "pulmonary vein"),
  mesh("FMA3", "vessels", "artery", "arteria radialis indicis"),
  mesh(
    "FMA4",
    "vessels",
    "vein",
    "source concept without an English vessel term",
  ),
  mesh("FMA5", "vessels", "other", "unclassified vascular source"),
  mesh("FMA6", "skeleton"),
  mesh("FMA7", "nerves"),
  mesh(
    "FMA8",
    "vessels",
    undefined,
    "artery-like name without source classification",
  ),
];

test("arterial subsets use source metadata and keep skeletal and nerve context", () => {
  assert.deepEqual(anatomyExcludedVesselIds(meshes, "artery"), [
    "FMA2",
    "FMA4",
    "FMA5",
    "FMA8",
  ]);
});

test("venous subsets include named and source-classified veins without guessing unknown data", () => {
  assert.deepEqual(anatomyExcludedVesselIds(meshes, "vein"), [
    "FMA1",
    "FMA3",
    "FMA5",
    "FMA8",
  ]);
});

test("showing all vessels restores the subset without changing source data", () => {
  const before = JSON.stringify(meshes);
  const arterial = anatomyExcludedVesselIds(meshes, "artery");
  arterial.push("extra");
  assert.deepEqual(anatomyExcludedVesselIds(meshes, "all"), []);
  assert.equal(JSON.stringify(meshes), before);
  assert.deepEqual(anatomyExcludedVesselIds(meshes, "artery"), [
    "FMA2",
    "FMA4",
    "FMA5",
    "FMA8",
  ]);
});
