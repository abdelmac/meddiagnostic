/** Prepare a new, empty migration or a local preview; never rewrite history. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { anatomyQuestions } from "../src/data/anatomy-questions";
import { anatomyQuestionsEn } from "../src/data/anatomy-questions.en";
import type { Question } from "../src/domain/types";

const requested = process.argv[2];
const preview = resolve(".local/anatomy-competitive-preview.sql");
const target = requested ? resolve(requested) : preview;
if (requested) {
  if (
    dirname(target) !== resolve("supabase/migrations") ||
    !/^\d{14}_anatomy_competitive_bank\.sql$/.test(basename(target)) ||
    !existsSync(target) ||
    readFileSync(target, "utf8").trim().length !== 0
  )
    throw Error(
      "Use a new empty migration created by Supabase CLI; existing SQL cannot be overwritten.",
    );
}

const original = readFileSync(
  "supabase/migrations/20261021142227_competitive.sql",
  "utf8",
);
const start = original.indexOf("create function competition.action(");
const end = original.indexOf(
  "revoke all on function competition.action",
  start,
);
if (start < 0 || end < 0) throw Error("Original competition action not found");
const selection =
  "(select content,random() as random_order from competition.question_bank where active order by random_order limit 10) selected;";
const replacement =
  "(select content,random() as random_order from competition.question_bank where active\n" +
  "    and (not (content ? 'studyYears') or content->'studyYears' @> jsonb_build_array(profile.study_year))\n" +
  "    order by random_order limit 10) selected;";
const oldAction = original.slice(start, end).trimEnd();
if (oldAction.split(selection).length !== 2)
  throw Error("Review the competition selector before generating a migration");
const action = oldAction
  .replace("create function", "create or replace function")
  .replace(selection, replacement)
  .replaceAll(
    "year_value not between 1 and 6",
    "year_value not between 1 and 12",
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
const values = anatomyQuestions.map((question) => {
  const english = anatomyQuestionsEn.find(
    (item) => item.id === question.id && item.version === question.version,
  );
  if (
    !english ||
    english.correct !== question.correct ||
    question.options.length !== 4 ||
    english.options.length !== 4 ||
    !question.diagram ||
    !question.studyYears?.length ||
    question.studyYears.some(
      (year) => !Number.isInteger(year) || year < 1 || year > 12,
    )
  )
    throw Error(`Invalid bilingual anatomy question: ${question.id}`);
  return `(${text(question.id)},${question.version},${json({
    id: question.id,
    correct: question.correct,
    studyYears: question.studyYears,
    fr: localized(question),
    en: localized(english),
  })})`;
});
if (!values.length) throw Error("No anatomy questions to seed");

const sql = `-- Original simplified anatomy exercises; medical review is still pending.
-- The private dispatcher keeps its existing authentication, membership and quota checks.
-- Clinical questions without studyYears retain their existing availability.
alter table competition.profiles drop constraint profiles_study_year_check;
alter table competition.profiles add constraint profiles_study_year_check check (study_year between 1 and 12);

${action}
revoke all on function competition.action(text,jsonb) from public, anon, authenticated;
grant execute on function competition.action(text,jsonb) to authenticated;

-- Per-language diagram metadata passes through the existing snapshot projection;
-- reasoning is withheld until the match finishes, and answer keys remain private.
insert into competition.question_bank(id,version,content) values
${values.join(",\n")}
on conflict(id) do update set version=excluded.version,content=excluded.content,active=true
where competition.question_bank.version<=excluded.version;
`;
if (!requested) mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, sql, "utf8");
console.log(
  `${requested ? "New migration" : "Local preview"}: ${values.length} bilingual anatomy questions. No remote database changed.`,
);
