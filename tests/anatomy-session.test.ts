import { test } from "node:test";
import assert from "node:assert/strict";
import { questions } from "../src/data/questions";
import { createSession } from "../src/domain/engine";
test("anatomie : le filtre d’année sélectionne les schémas adaptés sans répétition, y compris en internat", () => {
  for (const year of [1,2,3,4,5,6,7,8,9,10,11,12]) {
    const session = createSession(questions, { specialties: ["anatomie"], difficulty: "toutes", type: "visuel", count: 10, mode: "learning", timerMinutes: null, studyYear: year });
    assert.equal(session.studyYear, year);
    assert.ok(session.questionIds.length >= 6);
    assert.equal(new Set(session.questionIds).size, session.questionIds.length);
    for (const id of session.questionIds) {
      const q = questions.find((item) => item.id === id)!;
      assert.equal(q.specialty, "anatomie");
      assert.equal(q.type, "visuel");
      assert.ok(q.diagram?.structureId);
      assert.ok(q.studyYears?.includes(year));
    }
  }
  assert.throws(() => createSession(questions, { specialties: ["anatomie"], difficulty: "toutes", type: "clinique", count: 5, mode: "learning", timerMinutes: null }), /Aucune question/);
});
