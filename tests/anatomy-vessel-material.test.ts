import test from "node:test";
import assert from "node:assert/strict";
import { anatomyTissueProfile } from "../src/ui/anatomy-materials.web";

test("vascular colours follow source classification even when a name has no recognised vessel term", () => {
  const vein = anatomyTissueProfile({ system: "vessels", name: "Source component FJ5008", vascularKind: "vein" }, "study");
  const artery = anatomyTissueProfile({ system: "vessels", name: "Source component FJ2227", vascularKind: "artery" }, "study");
  assert.equal(vein.id, "vein");
  assert.equal(artery.id, "artery");
  assert.notEqual(vein.color, artery.color);
  assert.equal(anatomyTissueProfile({ system: "vessels", name: "artery to nerve", vascularKind: "artery" }, "natural").id, "artery");
  assert.equal(anatomyTissueProfile({ system: "vessels", name: "venous source label", vascularKind: "artery" }, "natural").id, "artery");
});

test("older anatomy without vascular metadata retains its existing tissue colours", () => {
  assert.equal(anatomyTissueProfile({ system: "vessels", name: "inferior vena cava" }, "study").id, "vein");
  assert.equal(anatomyTissueProfile({ system: "vessels", name: "aorta" }, "study").id, "artery");
});
