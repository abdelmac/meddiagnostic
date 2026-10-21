import test from "node:test";
import assert from "node:assert/strict";
import { buildAnatomyModel, anatomyAttachmentPoints } from "../src/data/anatomy-3d";
import { anatomyStructures, anatomySystems } from "../src/data/anatomy-structures";

test("all catalogue structures have finite selectable volumetric geometry", () => {
  for (const { id: system } of anatomySystems) {
    const model = buildAnatomyModel(system);
    const expected = anatomyStructures.filter((item) => item.system === system).map((item) => item.id).sort();
    assert.deepEqual([...model.structures.keys()].sort(), expected);
    model.structures.forEach((meshes) => meshes.forEach((mesh) => {
      const position = mesh.geometry.getAttribute("position");
      assert.ok(position.count > 12);
      for (const coordinate of position.array) assert.ok(Number.isFinite(coordinate));
      mesh.geometry.computeBoundingBox();
      assert.ok(mesh.geometry.boundingBox && !mesh.geometry.boundingBox.isEmpty());
      const bounds = mesh.geometry.boundingBox!;
      assert.ok(bounds.max.x > bounds.min.x && bounds.max.y > bounds.min.y && bounds.max.z > bounds.min.z);
    }));
    model.dispose();
  }
});

test("the resting mobile scene keeps draw-call batches bounded and preserves organ laterality", () => {
  const muscles = buildAnatomyModel("muscles");
  assert.ok(muscles.group.children.length < 60, "mobile volumes should stay batched by structure and material");
  muscles.dispose();
  const organs = buildAnatomyModel("organs");
  const centerX = (id: string) => {
    const mesh = organs.structures.get(id)![0]!;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    return (box.min.x + box.max.x) / 2;
  };
  // Anterior camera: the subject's right appears on screen-left.
  assert.ok(centerX("liver") < 0);
  assert.ok(centerX("heart") > 0);
  assert.ok(centerX("stomach") > 0);
  organs.dispose();
});

test("isolation, restoration and attachment markers follow the selected muscle", () => {
  const model = buildAnatomyModel("muscles");
  model.select("biceps", true, 0.35, true);
  model.structures.forEach((meshes, id) => meshes.forEach((mesh) => assert.equal(mesh.visible, id === "biceps")));
  assert.equal(model.attachments.visible, true);
  assert.deepEqual(model.attachments.children[0]!.position.toArray(), anatomyAttachmentPoints.biceps!.origin);
  assert.ok(model.context.every((mesh) => !mesh.visible));
  model.select("heart", true, Number.NaN, true);
  assert.ok([...model.structures.values()].flat().every((mesh) => mesh.visible));
  assert.equal(model.attachments.visible, false);
  model.select("deltoid", false, 1, false);
  assert.ok(model.context.every((mesh) => mesh.visible));
  assert.equal(model.attachments.visible, false);
  model.dispose();
});
