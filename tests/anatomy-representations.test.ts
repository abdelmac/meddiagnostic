import test from "node:test";
import assert from "node:assert/strict";
import { anatomyRepresentationChoices } from "../src/domain/anatomy-representations";

const entries = [
  { id: "femur-a", representationGroup: "left-femur", representationDefault: true },
  { id: "femur-b", representationGroup: "left-femur", representationDefault: false },
  { id: "tibia-a", representationGroup: "left-tibia", representationDefault: true },
  { id: "tibia-b", representationGroup: "left-tibia", representationDefault: false },
  { id: "nerve" },
];

test("each source bone has one default representation while other structures stay independent", () => {
  assert.deepEqual([...anatomyRepresentationChoices(entries, new Set())], [["left-femur", "femur-a"], ["left-tibia", "tibia-a"]]);
});

test("selecting an alternative replaces its default without replacing another bone", () => {
  const choices = anatomyRepresentationChoices(entries, new Set(["femur-b"]));
  assert.equal(choices.get("left-femur"), "femur-b");
  assert.equal(choices.get("left-tibia"), "tibia-a");
  assert.equal(anatomyRepresentationChoices(entries, new Set(["femur-a", "femur-b"])).get("left-femur"), "femur-a");
  assert.equal(anatomyRepresentationChoices(entries, new Set()).get("left-femur"), "femur-a");
});

test("a hidden alternative is not substituted when selecting another structure or a course landmark", () => {
  const preferred = new Set(["femur-b"]);
  const hidden = new Set(["femur-b"]);
  for (const selection of [new Set(["nerve"]), new Set(["tibia-a"]), new Set(["femur-a", "femur-b"])]) {
    const choices = anatomyRepresentationChoices(entries, selection, preferred);
    assert.equal(choices.get("left-femur"), "femur-b");
    assert.ok(hidden.has(choices.get("left-femur")!));
    assert.equal(entries.filter(entry => entry.representationGroup === "left-femur" && choices.get("left-femur") === entry.id && !hidden.has(entry.id)).length, 0);
  }
  const restored = anatomyRepresentationChoices(entries, new Set(["nerve"]), preferred);
  assert.equal(restored.get("left-femur"), "femur-b");
  assert.equal(anatomyRepresentationChoices(entries, new Set(["femur-a"]), preferred).get("left-femur"), "femur-a");
});
