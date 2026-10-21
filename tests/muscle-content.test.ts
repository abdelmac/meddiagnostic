import test from "node:test";
import assert from "node:assert/strict";
import { muscleAttachments, anatomyFocusLabels } from "../src/data/muscle-attachments";
import { muscleQuestions, muscleQuestionSeeds } from "../src/data/muscle-questions";
import { muscleQuestionsEn } from "../src/data/muscle-questions.en";
import { anatomyStructures } from "../src/data/anatomy-structures";
import { anatomyShape } from "../src/data/anatomy-geometry";

test("98 exercices musculaires originaux ont des choix distincts et des réponses réparties", () => {
  assert.equal(muscleQuestions.length, 98);
  assert.equal(new Set(muscleQuestions.map((q) => q.id)).size, 98);
  assert.equal(new Set(muscleQuestions.map((q) => q.title)).size, 98);
  assert.equal(new Set(muscleQuestionsEn.map((q) => q.title)).size, 98);
  const counts = [0, 0, 0, 0];
  for (const [index, question] of muscleQuestions.entries()) {
    assert.equal(question.version, 1);
    assert.equal(question.status, "demo");
    assert.equal(question.medicalReviewer, null);
    assert.equal(question.specialty, "anatomie");
    assert.equal(question.type, "visuel");
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map((o) => o.label)).size, 4, question.id);
    assert.ok(question.options.every((o) => o.explanation.trim().length > 10));
    assert.equal(question.options[question.correct]!.label, muscleQuestionSeeds[index]!.answer[0]);
    counts[question.correct] = counts[question.correct]! + 1;
  }
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
});

test("les schémas représentent bien les sept muscles, avec quatre axes de révision chacun", () => {
  for (const [id, muscle] of Object.entries(muscleAttachments)) {
    const bank = muscleQuestions.filter((q) => q.diagram?.structureId === id);
    assert.equal(bank.length, 14, id);
    const structure = anatomyStructures.find((s) => s.id === id);
    assert.equal(structure?.system, "muscles");
    for (const question of bank) {
      const view = question.diagram?.view === "back" ? "posterior" : "anterior";
      assert.ok(structure.views.includes(view));
      assert.ok(anatomyShape(id, view));
      assert.ok(question.anatomyFocus in anatomyFocusLabels);
    }
    for (const field of ["origin", "insertion", "action", "innervation"] as const) {
      assert.ok(muscle[field].fr && muscle[field].en);
      assert.ok(bank.some((q) => q.anatomyFocus === field), `${id}: ${field}`);
    }
    assert.ok(muscle.sources.length >= 2);
    for (const source of muscle.sources) {
      assert.ok(source.title.length > 15);
      assert.equal(new URL(source.url).protocol, "https:");
      assert.ok(["www.ncbi.nlm.nih.gov", "openstax.org"].includes(new URL(source.url).hostname));
    }
  }
});

test("français et anglais partagent versions, réponses, filtres et références sans fuite de langue", () => {
  assert.equal(muscleQuestionsEn.length, muscleQuestions.length);
  muscleQuestions.forEach((fr, index) => {
    const en = muscleQuestionsEn[index]!;
    assert.equal(en.id, fr.id);
    assert.equal(en.version, fr.version);
    assert.equal(en.correct, fr.correct);
    assert.deepEqual(en.diagram, fr.diagram);
    assert.deepEqual(en.studyYears, fr.studyYears);
    assert.deepEqual(en.sources, fr.sources);
    assert.equal(en.anatomyFocus, fr.anatomyFocus);
    assert.notEqual(en.title, fr.title);
    assert.notEqual(en.context, fr.context);
    assert.notEqual(en.reasoning, fr.reasoning);
    assert.equal(en.options[en.correct]!.label, muscleQuestionSeeds[index]!.answer[1]);
    assert.equal(new Set(en.options.map((o) => o.label)).size, 4);
    assert.ok(!en.title.includes("Quel ") && !en.title.includes("Quelle "));
  });
});

test("les exercices fondamentaux restent accessibles à chaque année et les applications débutent plus tard", () => {
  for (let year = 1; year <= 12; year++) {
    assert.ok(muscleQuestions.filter((q) => q.studyYears?.includes(year)).length >= 28);
  }
  for (const question of muscleQuestions) {
    assert.ok(question.studyYears!.every((year) => Number.isInteger(year) && year >= 1 && year <= 12));
    if (question.difficulty === "avancé") {
      assert.ok(!question.studyYears!.includes(1));
      assert.ok(question.studyYears!.includes(12));
    }
  }
  const find = (suffix: string) => muscleQuestions.find((q) => q.id.endsWith(suffix))!;
  assert.equal(find("biceps-long-head").options[find("biceps-long-head").correct]!.label, "Tubercule supraglénoïdal");
  assert.equal(find("triceps-long-head").options[find("triceps-long-head").correct]!.label, "Tubercule infraglénoïdal de la scapula");
  assert.equal(find("pectoralis-major-groove-lip").options[find("pectoralis-major-groove-lip").correct]!.label, "Lèvre latérale");
  assert.equal(find("quadriceps-hip-flexor").options[find("quadriceps-hip-flexor").correct]!.label, "Droit fémoral");
  assert.equal(find("diaphragm-cervical-roots").options[find("diaphragm-cervical-roots").correct]!.label, "C3–C5");
});
