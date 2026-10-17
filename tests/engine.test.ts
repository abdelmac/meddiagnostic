import { test } from "node:test";
import assert from "node:assert/strict";
import { questions, visualDrafts } from "../src/data/questions";
import {
  createSession,
  initialState,
  recordAnswer,
  nextReview,
  finishSession,
  score,
  dueIds,
  mergeAttempts,
} from "../src/domain/engine";
import type { LocalState } from "../src/domain/types";
const config = {
  specialties: ["dermatologie", "cardiologie", "pneumologie"] as const,
  difficulty: "toutes",
  type: "tous",
  count: 5,
  mode: "learning" as const,
  timerMinutes: null,
};
const makeSession = (count = 5) =>
  createSession(
    questions,
    { ...config, specialties: [...config.specialties], count },
    () => 0.42,
  );
test("la banque démo possède 30 questions cohérentes, aucune validation inventée", () => {
  assert.equal(questions.length, 30);
  assert.equal(new Set(questions.map((q) => q.id)).size, 30);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options.map((o) => o.label)).size, 4);
    assert.ok(q.options[q.correct]);
    assert.ok(
      q.reasoning &&
        q.takeaway &&
        q.objective &&
        q.sources.length &&
        q.clues.length,
    );
    assert.equal(q.medicalReviewer, null);
    assert.equal(q.status, "demo");
  }
});
test("une session ne répète pas de question et réduit sa longueur au stock", () => {
  const session = createSession(questions, {
    ...config,
    specialties: ["dermatologie"],
    count: 20,
  });
  assert.equal(session.questionIds.length, 10);
  assert.equal(new Set(session.questionIds).size, 10);
});
test("les filtres sont respectés, les visuels brouillons restent exclus", () => {
  const s = createSession([...questions, ...visualDrafts], {
    ...config,
    specialties: ["cardiologie"],
    difficulty: "intermédiaire",
  });
  assert.ok(
    s.questionIds.every(
      (id) => questions.find((q) => q.id === id)?.specialty === "cardiologie",
    ),
  );
  assert.equal(s.questionIds.length, 4);
  assert.throws(
    () =>
      createSession([...questions, ...visualDrafts], {
        ...config,
        specialties: ["dermatologie"],
        type: "visuel",
      }),
    /Aucune question/,
  );
});
test("réponse idempotente, score, et reprise sérialisée", () => {
  const session = makeSession();
  const q = questions.find((q) => q.id === session.questionIds[0])!;
  const state: LocalState = { ...initialState, active: session };
  const a = recordAnswer(state, q, q.correct, "solide");
  assert.equal(a.attempts.length, 1);
  assert.equal(score(a.active!, questions), 1);
  assert.equal(recordAnswer(a, q, 0, "fragile"), a);
  const resumed: LocalState = JSON.parse(JSON.stringify(a));
  assert.deepEqual(resumed.active, a.active);
  assert.equal(resumed.active!.answers[q.id]?.choice, q.correct);
  const end = finishSession(resumed);
  assert.equal(end.active, null);
  assert.equal(end.sessions.length, 1);
  assert.equal(finishSession(end), end);
});
test("le moteur rejette une réponse hors question ou hors propositions", () => {
  const session = makeSession();
  const q = questions.find((q) => q.id === session.questionIds[0])!;
  const state = { ...initialState, active: session };
  assert.throws(() => recordAnswer(state, q, 99, "moyenne"), /invalide/);
  assert.equal(
    recordAnswer(
      state,
      questions.find((item) => item.id !== q.id)!,
      0,
      "solide",
    ),
    state,
  );
});
test("les questions nouvelles sont distinguées des répétitions", () => {
  const session = makeSession();
  const q = questions.find((q) => q.id === session.questionIds[0])!;
  const first = recordAnswer(
    { ...initialState, active: session },
    q,
    q.correct,
    "solide",
  );
  const secondSession = { ...session, id: "second" };
  const second = recordAnswer(
    { ...finishSession(first), active: secondSession },
    q,
    q.correct,
    "moyenne",
  );
  assert.equal(first.attempts[0]!.repeated, false);
  assert.equal(second.attempts[1]!.repeated, true);
});
test("révision à J+1 après erreur ou doute, intervalles croissants et plafonnés", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const fail = nextReview(undefined, false, "solide", now, "q");
  assert.equal(fail.interval, 1);
  assert.equal(fail.streak, 0);
  assert.equal(fail.due, "2026-10-18T12:00:00.000Z");
  const good = nextReview(undefined, true, "solide", now, "q");
  assert.equal(good.interval, 4);
  assert.equal(nextReview(good, true, "solide", now, "q").interval, 12);
  assert.equal(nextReview(good, true, "fragile", now, "q").interval, 1);
  assert.equal(
    nextReview({ ...good, interval: 40 }, true, "solide", now, "q").interval,
    60,
  );
  const state = {
    ...initialState,
    reviews: { q: fail },
    marked: ["q", "manual"],
  };
  assert.deepEqual(dueIds(state, now), ["q", "manual"]);
  assert.deepEqual(dueIds({ ...state, marked: [] }, now), []);
  assert.deepEqual(dueIds({ ...state, marked: [] }, new Date("2026-10-19")), [
    "q",
  ]);
});
test("la fusion des tentatives est idempotente (préparation de synchronisation)", () => {
  const s = makeSession();
  const q = questions.find((q) => q.id === s.questionIds[0])!;
  const a = recordAnswer(
    { ...initialState, active: s },
    q,
    0,
    "moyenne",
  ).attempts;
  assert.deepEqual(mergeAttempts(a, a), a);
});
test("un examen inachevé compte les non-réponses comme non réussies", () => {
  const s = makeSession();
  assert.equal(score(s, questions), 0);
});
