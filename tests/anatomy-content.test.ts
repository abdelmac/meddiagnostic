import test from "node:test";
import assert from "node:assert/strict";
import { anatomyQuestions } from "../src/data/anatomy-questions";
import {
  anatomyQuestionsEn,
  anatomyTranslations,
} from "../src/data/anatomy-questions.en";
import {
  anatomyCourseForYear,
  anatomyCourses,
  anatomyCourseSources,
} from "../src/data/anatomy-courses";
import { anatomyStructures } from "../src/data/anatomy-structures";
import { anatomyShape } from "../src/data/anatomy-geometry";

test("chaque question illustrée référence une structure dessinable dans sa vue", () => {
  assert.equal(anatomyQuestions.length, 42);
  assert.equal(
    new Set(anatomyQuestions.map((q) => q.id)).size,
    anatomyQuestions.length,
  );
  for (const question of anatomyQuestions) {
    assert.equal(question.type, "visuel");
    assert.equal(question.status, "demo");
    assert.equal(question.medicalReviewer, null);
    assert.ok(question.diagram);
    const structure = anatomyStructures.find(
      (item) => item.id === question.diagram!.structureId,
    );
    assert.ok(structure, question.id);
    const view = question.diagram.view === "back" ? "posterior" : "anterior";
    assert.ok(structure.views.includes(view), `${question.id}: ${view}`);
    assert.ok(
      anatomyShape(structure.id, view),
      `${question.id}: dessin absent`,
    );
    assert.equal(question.options.length, 4);
    assert.equal(
      new Set(question.options.map((option) => option.label)).size,
      4,
    );
    assert.ok(question.options[question.correct]?.explanation);
    assert.ok(
      question.sources.every(
        (source) => new URL(source.url).protocol === "https:",
      ),
    );
  }
});

test("les deux langues conservent les schémas, niveaux et positions des réponses", () => {
  assert.equal(
    Object.keys(anatomyTranslations).length,
    anatomyQuestions.length,
  );
  assert.equal(anatomyQuestionsEn.length, anatomyQuestions.length);
  anatomyQuestions.forEach((fr, index) => {
    const en = anatomyQuestionsEn[index]!;
    assert.equal(en.id, fr.id);
    assert.equal(en.correct, fr.correct);
    assert.deepEqual(en.diagram, fr.diagram);
    assert.deepEqual(en.studyYears, fr.studyYears);
    assert.deepEqual(en.sources, fr.sources);
    assert.notEqual(en.title, fr.title);
    assert.notEqual(en.reasoning, fr.reasoning);
    assert.ok(en.options.every((option) => option.label && option.explanation));
  });
  const expected: Record<string, [string, string]> = {
    "anatomie-ulna": ["Ulna", "Ulna"],
    "anatomie-spinal-cord": ["Vers L1–L2", "L1–L2"],
    "anatomie-femoral-artery": [
      "Artère iliaque externe",
      "External iliac artery",
    ],
    "anatomie-brachial-plexus-advanced": [
      "Nerfs radial et axillaire",
      "Radial and axillary nerves",
    ],
  };
  for (const [id, labels] of Object.entries(expected)) {
    for (const [index, bank] of [
      anatomyQuestions,
      anatomyQuestionsEn,
    ].entries()) {
      const question = bank.find((q) => q.id === id)!;
      assert.equal(question.options[question.correct]?.label, labels[index]);
    }
  }
});

test("les parcours couvrent la première année à l’internat avec cours et références", () => {
  assert.equal(anatomyCourses.length, 7);
  for (let year = 1; year <= 12; year++) {
    const pool = anatomyQuestions.filter((q) => q.studyYears?.includes(year));
    assert.equal(pool.length, 6, `année ${year}`);
    const course = anatomyCourseForYear(year);
    assert.ok(course.title.fr && course.title.en);
    assert.ok(course.sections.length >= 3);
    assert.ok(
      course.sections.every((section) => section.body.fr && section.body.en),
    );
    assert.ok(anatomyCourseSources(year).length);
    assert.ok(
      course.structureIds.every((id) =>
        anatomyStructures.some((structure) => structure.id === id),
      ),
    );
    for (const question of pool)
      assert.ok(course.structureIds.includes(question.diagram!.structureId));
  }
});
