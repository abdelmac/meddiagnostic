import { test } from "node:test";
import assert from "node:assert/strict";
import { anatomyStructures, anatomySystems } from "../src/data/anatomy-structures";
import { anatomyCanvas, anatomyShapes, anatomyShape, anatomyViewBox } from "../src/data/anatomy-geometry";

test("les 36 repères bilingues ont une géométrie et une référence pour chaque vue annoncée", () => {
  assert.equal(anatomyStructures.length, 36);
  assert.equal(new Set(anatomyStructures.map((item) => item.id)).size, 36);
  assert.equal(anatomySystems.length, 5);
  for (const structure of anatomyStructures) {
    assert.ok(anatomySystems.some((system) => system.id === structure.system));
    for (const language of ["fr", "en"] as const) {
      assert.ok(structure.name[language].length > 2);
      assert.ok(structure.summary[language].length > 15);
      assert.ok(structure.region[language].length > 2);
    }
    assert.ok(structure.sources.every((url) => new URL(url).hostname === "open.oregonstate.education"));
    for (const view of structure.views) {
      const shape = anatomyShape(structure.id, view);
      assert.ok(shape, `${structure.id} manque en vue ${view}`);
      assert.ok(shape.path.startsWith("M"));
      assert.ok(shape.anchor[0] > 0 && shape.anchor[0] < anatomyCanvas.width);
      assert.ok(shape.anchor[1] > 0 && shape.anchor[1] < anatomyCanvas.height);
    }
  }
  assert.ok(anatomyShapes.every((shape) => anatomyStructures.some((structure) => structure.id === shape.id)));
});

test("les repères respectent la latéralité et distinguent les faces de dissection", () => {
  // Subject's right is image-left anteriorly; paired kidneys are shown posteriorly.
  assert.ok(anatomyShape("liver", "anterior")!.anchor[0] < 160);
  assert.ok(anatomyShape("stomach", "anterior")!.anchor[0] > 160);
  assert.ok(anatomyShape("heart", "anterior")!.anchor[0] > 160);
  assert.ok(anatomyShape("radius", "anterior")!.anchor[0] < anatomyShape("ulna", "anterior")!.anchor[0]);
  for (const posterior of ["scapula", "triceps", "radial-nerve", "sciatic-nerve", "tibial-nerve", "spinal-cord", "kidneys"]) {
    assert.ok(anatomyShape(posterior, "posterior"));
    assert.equal(anatomyShape(posterior, "anterior"), undefined);
  }
  assert.ok(anatomyShape("spinal-cord")!.anchor[1] < anatomyShape("sciatic-nerve")!.anchor[1]);
  assert.ok(anatomyShape("sciatic-nerve")!.anchor[1] < anatomyShape("tibial-nerve")!.anchor[1]);
});

test("le zoom reste dans le canevas et conserve le repère sélectionné dans la vue", () => {
  for (const zoom of [Number.NaN, -1, 1, 1.5, 2, 2.5, 100]) {
    for (const shape of anatomyShapes) {
      const box = anatomyViewBox(zoom, shape.anchor);
      assert.ok(box.x >= 0 && box.y >= 0);
      assert.ok(box.x + box.width <= 320.00001);
      assert.ok(box.y + box.height <= 720.00001);
      assert.ok(shape.anchor[0] >= box.x && shape.anchor[0] <= box.x + box.width);
      assert.ok(shape.anchor[1] >= box.y && shape.anchor[1] <= box.y + box.height);
    }
  }
});
