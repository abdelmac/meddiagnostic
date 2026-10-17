import { test } from "node:test";
import assert from "node:assert/strict";
import { questions } from "../src/data/questions";
import { questionsEn, englishSeeds } from "../src/data/questions.en";
import { en } from "../src/i18n/en";
test("les 30 traductions conservent les identifiants, versions et indices des bonnes réponses", () => {
  assert.equal(questionsEn.length, 30);
  questionsEn.forEach((q, i) => {
    const original = questions[i]!;
    assert.equal(q.id, original.id);
    assert.equal(q.version, original.version);
    assert.equal(q.correct, original.correct);
    assert.equal(q.options[q.correct]!.label, englishSeeds[i]![0]);
    assert.notEqual(q.context, original.context);
    assert.notEqual(q.reasoning, original.reasoning);
    assert.equal(q.status, "demo");
    assert.equal(q.medicalReviewer, null);
    assert.equal(q.clues.length, original.clues.length);
  });
});
test("les traductions interpolées ne créent pas de nouveaux paramètres", () => {
  for (const [fr, translated] of Object.entries(en)) {
    const available = new Set([...fr.matchAll(/\{(\d+)\}/g)].map((m) => m[1]));
    for (const m of translated.matchAll(/\{(\d+)\}/g))
      assert.ok(available.has(m[1]), `${fr}: paramètre ${m[1]} absent`);
  }
});
