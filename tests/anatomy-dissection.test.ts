import test from "node:test";
import assert from "node:assert/strict";
import {
  anatomyDissectionReducer as reduce,
  emptyAnatomyDissection,
} from "../src/domain/anatomy-dissection";

test("dissection restores each removed anatomical group in reverse order", () => {
  const first = reduce(emptyAnatomyDissection(), {
    type: "toggle",
    ids: ["FMA13377", "FMA13378", "FMA13377"],
  });
  const second = reduce(first, { type: "toggle", ids: ["FMA34682"] });
  assert.deepEqual(first.hiddenIds, ["FMA13377", "FMA13378"]);
  assert.deepEqual(reduce(second, { type: "undo" }), first);
  assert.deepEqual(
    reduce(reduce(second, { type: "undo" }), { type: "undo" }),
    emptyAnatomyDissection(),
  );
  assert.deepEqual(first.hiddenIds, ["FMA13377", "FMA13378"]);
});

test("restoring hidden anatomy clears visibility only and stale source history", () => {
  const removed = reduce(emptyAnatomyDissection(), {
    type: "toggle",
    ids: ["FMA13377"],
  });
  assert.deepEqual(
    reduce(removed, { type: "restore" }),
    emptyAnatomyDissection(),
  );
  assert.deepEqual(
    reduce(removed, { type: "set", ids: [] }),
    emptyAnatomyDissection(),
  );
  assert.equal(reduce(removed, { type: "set", ids: ["FMA13377"] }), removed);
  const revealed = reduce(removed, { type: "toggle", ids: ["FMA13377"] });
  assert.deepEqual(revealed.hiddenIds, []);
  assert.deepEqual(revealed.history, []);
  assert.equal(reduce(revealed, { type: "undo" }), revealed);
  assert.deepEqual(Object.keys(removed).sort(), ["hiddenIds", "history"]);
});

test("undo only restores the newly removed structures in a partially hidden group", () => {
  const first = reduce(emptyAnatomyDissection(), {
    type: "toggle",
    ids: ["FMA13377"],
  });
  const partial = reduce(first, {
    type: "toggle",
    ids: ["FMA13377", "FMA13378"],
  });
  assert.deepEqual(reduce(partial, { type: "undo" }), first);
  const shownAgain = reduce(partial, { type: "toggle", ids: ["FMA13378"] });
  assert.deepEqual(shownAgain, first);
  const revealedBySearch = reduce(partial, {
    type: "set",
    ids: (current) => current.filter((id) => id !== "FMA13378"),
  });
  assert.deepEqual(revealedBySearch.hiddenIds, first.hiddenIds);
  assert.equal(revealedBySearch.history.length, 0);
});

test("dissection history is bounded without mutating previous snapshots", () => {
  const empty = emptyAnatomyDissection();
  let state = empty;
  for (let index = 0; index < 50; index++)
    state = reduce(state, { type: "toggle", ids: [`FMA${index}`] });
  assert.equal(state.hiddenIds.length, 50);
  assert.equal(state.history.length, 32);
  assert.deepEqual(empty, emptyAnatomyDissection());
  assert.equal(reduce(empty, { type: "undo" }), empty);
  assert.equal(reduce(empty, { type: "toggle", ids: [] }), empty);
});
