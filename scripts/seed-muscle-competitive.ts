/** Add the original bilingual muscle bank to a new CLI-created migration only. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { muscleQuestions } from "../src/data/muscle-questions";
import { muscleQuestionsEn } from "../src/data/muscle-questions.en";
import type { Question } from "../src/domain/types";

const requested = process.argv[2];
const target = requested
  ? resolve(requested)
  : resolve(".local/muscle-competitive-preview.sql");
if (
  requested &&
  (dirname(target) !== resolve("supabase/migrations") ||
    !/^\d{14}_muscle_quiz_bank\.sql$/.test(basename(target)) ||
    !existsSync(target) ||
    readFileSync(target, "utf8").trim().length !== 0)
)
  throw Error(
    "Pass a new, empty muscle_quiz_bank migration created by Supabase CLI. Applied migrations cannot be overwritten.",
  );

const text = (value: string) => `'${value.replaceAll("'", "''")}'`;
const json = (value: unknown) => `${text(JSON.stringify(value))}::jsonb`;
const localized = (question: Question) => ({
  title: question.title,
  context: question.context,
  options: question.options.map((option) => option.label),
  reasoning: question.reasoning,
  diagram: question.diagram,
});
// Preserve the existing membership guard and private answer projection, adding
// only the viewer's already accepted answer timestamps for cross-device streaks.
const original = readFileSync(
  "supabase/migrations/20261021142227_competitive.sql",
  "utf8",
);
const snapshotStart = original.indexOf("create function competition.snapshot(");
const snapshotEnd = original.indexOf(
  "revoke all on function competition.snapshot",
  snapshotStart,
);
const projection = "'total',10,'ordinal',n,'question'";
if (snapshotStart < 0 || snapshotEnd < 0)
  throw Error("Review the existing competition snapshot before extending it.");
const originalSnapshot = original.slice(snapshotStart, snapshotEnd).trimEnd();
if (originalSnapshot.split(projection).length !== 2)
  throw Error(
    "The competition projection changed; review the timestamp extension.",
  );
const snapshot = originalSnapshot
  .replace("create function", "create or replace function")
  .replace(
    projection,
    "'activity',(select coalesce(jsonb_agg(jsonb_build_object('ordinal',ans.ordinal,'at',ans.answered_at) order by ans.ordinal),'[]'::jsonb) from competition.answers ans where ans.match_id=target and ans.user_id=viewer),\n " +
      projection,
  );
const ids = new Set(muscleQuestions.map((question) => question.id));
if (
  !muscleQuestions.length ||
  ids.size !== muscleQuestions.length ||
  muscleQuestionsEn.length !== muscleQuestions.length ||
  new Set(muscleQuestionsEn.map((question) => question.id)).size !== ids.size
)
  throw Error("The bilingual muscle bank must contain unique matching IDs.");

const values = muscleQuestions.map((question) => {
  const english = muscleQuestionsEn.find((item) => item.id === question.id);
  if (
    !english ||
    english.version !== question.version ||
    english.correct !== question.correct ||
    question.specialty !== "anatomie" ||
    !question.anatomyFocus ||
    question.anatomyFocus !== english.anatomyFocus ||
    question.options.length !== 4 ||
    english.options.length !== 4 ||
    !Number.isInteger(question.correct) ||
    question.correct < 0 ||
    question.correct > 3 ||
    !question.diagram?.structureId ||
    JSON.stringify(question.diagram) !== JSON.stringify(english.diagram) ||
    !question.studyYears?.length ||
    JSON.stringify(question.studyYears) !==
      JSON.stringify(english.studyYears) ||
    question.studyYears.some(
      (year) => !Number.isInteger(year) || year < 1 || year > 12,
    ) ||
    !question.sources.length ||
    !question.reasoning ||
    !english.reasoning
  )
    throw Error(`Invalid bilingual muscle exercise: ${question.id}`);
  return `(${text(question.id)},${question.version},${json({
    id: question.id,
    version: question.version,
    correct: question.correct,
    anatomyFocus: question.anatomyFocus,
    studyYears: question.studyYears,
    sources: question.sources,
    editorialDate: question.editorialDate,
    medicalReviewer: question.medicalReviewer,
    fr: localized(question),
    en: localized(english),
  })})`;
});

const sql = `-- Ippomed original muscle exercises: origins, insertions, innervation and actions.
-- Educational demo content; independent medical review remains pending.
-- Only the existing private bank changes. Authentication, year filtering,
-- reservations, membership checks, timers and server-side grading stay in place.
-- Match snapshots keep their original question version, even after a bank update.
${snapshot}
revoke all on function competition.snapshot(uuid,uuid) from public, anon, authenticated;

insert into competition.question_bank(id,version,content) values
${values.join(",\n")}
on conflict(id) do update set version=excluded.version,content=excluded.content,active=true
where competition.question_bank.version<excluded.version;
`;
if (!requested) mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, sql, "utf8");
console.log(
  `${requested ? "New migration" : "Local preview"}: ${values.length} bilingual muscle exercises. No remote database changed.`,
);
