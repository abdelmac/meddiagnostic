import test from "node:test";
import assert from "node:assert/strict";
import { getSource, searchSources, sourceCatalog } from "../src/data/source-catalog";
import { reviewedSourceQuestionIds, sourceDraftQuestions } from "../src/data/source-drafts";

test("provided-source drafts remain unreviewed and outside any reviewed question pool", () => {
  assert.ok(sourceDraftQuestions.length >= 60);
  assert.equal(new Set(sourceDraftQuestions.map((question) => question.id)).size, sourceDraftQuestions.length);
  assert.deepEqual(reviewedSourceQuestionIds, []);
  for (const question of sourceDraftQuestions) {
    assert.equal(question.status, "draft");
    assert.equal(question.medicalReviewer, null);
    const source = getSource(question.sourceId);
    assert.ok(source, `Missing source for ${question.id}`);
    assert.equal(source.format, "pdf");
    assert.equal(source.inspection, "text-extracted");
    assert.ok(source.pages && source.pages > 0);
    assert.ok(question.pdfPages.length > 0);
    assert.ok(question.pdfPages.every((page) => Number.isInteger(page) && page >= 1 && page <= source.pages!));
    for (const language of ["fr", "en"] as const) {
      const copy = question[language];
      assert.equal(copy.options.length, 4);
      assert.equal(new Set(copy.options).size, 4);
      assert.ok(copy.options[question.correct]);
      assert.ok(copy.prompt.length >= 30);
      assert.ok(copy.explanation.length >= 40);
    }
  }
});

test("public bibliography contains no local paths or extracted source paragraphs", () => {
  const serialized = JSON.stringify(sourceCatalog);
  assert.equal(/[A-Z]:[\\/]|Users[\\/]zakaria|"text"\s*:|"path"\s*:|"member"\s*:/i.test(serialized), false);
  assert.equal(new Set(sourceCatalog.sources.map((source) => source.id)).size, sourceCatalog.sources.length);
  assert.ok(sourceCatalog.inventory.archiveMembers >= 75);
  assert.ok(searchSources("physiology", "pdf").length > 0);
  assert.ok(searchSources("langman").some((source) => source.id === "src-ad5feba24e85cd3f"));
  assert.deepEqual(searchSources("no-such-medical-document-123456"), []);
});
