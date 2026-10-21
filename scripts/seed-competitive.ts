/** Preview the original clinical bank without changing an applied migration. */
import { readFileSync, writeFileSync } from "node:fs";
import { clinicalQuestions as questions } from "../src/data/questions";
import { questionsEn } from "../src/data/questions.en";

const file = "supabase/migrations/20261021142227_competitive.sql";
const marker = "-- BEGIN ORIGINAL DEMO BANK";
const sql = readFileSync(file, "utf8").split(marker)[0]!.trimEnd();
const quote = (value: unknown) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const text = (value: string) => `'${value.replaceAll("'", "''")}'`;
const content = (q: (typeof questions)[number]) => ({
  title: q.title,
  context: q.context,
  options: q.options.map((option) => option.label),
  reasoning: q.reasoning,
});
const values = questions
  .filter((q) => q.status === "demo")
  .map((q) => {
    const english = questionsEn.find(
      (item) => item.id === q.id && item.version === q.version,
    );
    if (!english) throw Error(`Missing English version: ${q.id}`);
    return `(${text(q.id)},${q.version},${quote({ correct: q.correct, fr: content(q), en: content(english) })})`;
  });
writeFileSync(
  ".local/competitive-clinical-preview.sql",
  `${sql}\n\n${marker}\n-- Original fictional educational drafts; not medically reviewed. Never expose answer keys through the Data API.\ninsert into competition.question_bank(id,version,content) values\n${values.join(",\n")};\n`,
  "utf8",
);
console.log(`Private beta bank preview: ${values.length} bilingual clinical questions. Applied migrations are unchanged.`);
