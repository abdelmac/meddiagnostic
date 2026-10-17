import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  createSession,
  recordAnswer,
} from "../src/domain/engine";
import { questions } from "../src/data/questions";
import {
  captureChanges,
  mergeProgress,
  prepareSnapshot,
} from "../src/domain/sync";
const empty = () => structuredClone(initialState);
test("un retrait de favori survit à un appareil obsolète et les fusions ne dupliquent pas les tentatives", () => {
  const s = createSession(questions, {
    specialties: ["cardiologie"],
    difficulty: "toutes",
    type: "tous",
    count: 5,
    mode: "learning",
    timerMinutes: null,
  });
  const q = questions.find((q) => q.id === s.questionIds[0])!;
  const a = captureChanges(
    empty(),
    recordAnswer({ ...empty(), active: s }, q, q.correct, "solide"),
  );
  const withFavorite = captureChanges(a, { ...a, favorites: [q.id] });
  const obsolete = prepareSnapshot(withFavorite);
  const removed = captureChanges(withFavorite, {
    ...withFavorite,
    favorites: [],
  });
  const merged = mergeProgress(removed, obsolete);
  assert.equal(merged.favorites.length, 0);
  assert.equal(merged.attempts.length, 1);
  assert.deepEqual(mergeProgress(merged, obsolete), merged);
});
test("un nouvel appareil importe les préférences existantes sans les écraser avec ses valeurs par défaut", () => {
  const remote = captureChanges(empty(), {
    ...empty(),
    preferences: { ...initialState.preferences, dailyGoal: 20, dark: true },
  });
  const merged = mergeProgress(empty(), prepareSnapshot(remote));
  assert.equal(merged.preferences.dailyGoal, 20);
  assert.equal(merged.preferences.dark, true);
});
test("une résolution concurrente est déterministe dans les deux sens", () => {
  const a = empty();
  a.syncMeta = { actor: "a", clock: 0, fields: {} };
  const b = empty();
  b.syncMeta = { actor: "b", clock: 0, fields: {} };
  const left = captureChanges(a, {
    ...a,
    preferences: { ...a.preferences, dailyGoal: 10 },
  });
  const right = captureChanges(b, {
    ...b,
    preferences: { ...b.preferences, dailyGoal: 20 },
  });
  assert.equal(mergeProgress(left, right).preferences.dailyGoal, 20);
  assert.equal(mergeProgress(right, left).preferences.dailyGoal, 20);
});
