import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { anatomyQuestions } from "../src/data/anatomy-questions";
import { anatomyQuestionsEn } from "../src/data/anatomy-questions.en";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const matchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("competitive anatomy: years 1–12 filter server-side and diagrams preserve private grading until final review", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth;create table auth.users(id uuid primary key);
      create role anon;create role authenticated;create role service_role bypassrls;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon,service_role;
      insert into auth.users values('${alice}'),('${bob}');`);
    for (const filename of readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await db.exec(readFileSync(`supabase/migrations/${filename}`, "utf8"));
    const user = async <T>(id: string, work: (tx: any) => Promise<T>) =>
      db.transaction(async (tx) => {
        await tx.exec(
          `set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);`,
        );
        return work(tx);
      });
    const call = async (id: string, command: string, payload = {}) =>
      user(
        id,
        async (tx) =>
          (
            await tx.query("select public.competitive($1,$2) as result", [
              command,
              payload,
            ])
          ).rows[0].result,
      ) as Promise<any>;

    const anatomyBank = (
      await db.query<{ content: any }>(
        "select content from competition.question_bank where id = any($1::text[])",
        [anatomyQuestions.map((question) => question.id)],
      )
    ).rows;
    assert.equal(anatomyBank.length, anatomyQuestions.length);
    for (const { content } of anatomyBank) {
      const source = anatomyQuestions.find((question) => question.id === content.id);
      const english = anatomyQuestionsEn.find((question) => question.id === content.id);
      assert.ok(source);
      assert.ok(english);
      assert.equal(content.correct, source.correct);
      assert.equal(content.fr.reasoning, source.reasoning);
      assert.equal(content.en.reasoning, english.reasoning);
      assert.equal(content.fr.title, source.title);
      assert.equal(content.en.title, english.title);
      assert.deepEqual(content.studyYears, source.studyYears);
      assert.deepEqual(content.fr.diagram, source.diagram);
      assert.deepEqual(content.fr.diagram, content.en.diagram);
      assert.equal(typeof content.fr.diagram.structureId, "string");
      assert.equal(content.fr.options.length, 4);
      assert.equal(content.en.options.length, 4);
    }
    await assert.rejects(
      user(alice, (tx) =>
        tx.query("select content from competition.question_bank"),
      ),
    );

    // With only six relevant anatomy exercises per year, a ten-question match
    // must fail rather than silently pulling advanced exercises from other years.
    await db.query("update competition.question_bank set active=(id=any($1::text[]))", [anatomyQuestions.map((question) => question.id)]);
    for (let year = 1; year <= 12; year++) {
      const profile = await call(alice, "profile", {
        nickname: "Anatomy Alice",
        studyYear: year,
      });
      assert.equal(profile.study_year, year);
      await assert.rejects(
        call(alice, "create", { mode: "duel", requestId: matchId }),
        /question_bank_unavailable/,
      );
    }
    await assert.rejects(
      call(alice, "profile", { nickname: "Anatomy Alice", studyYear: 13 }),
      /invalid_profile/,
    );
    await assert.rejects(
      call(alice, "leaderboard", { studyYear: 13 }),
      /invalid_study_year/,
    );

    await call(alice, "profile", { nickname: "Anatomy Alice", studyYear: 10 });
    await call(bob, "profile", { nickname: "Anatomy Bob", studyYear: 10 });
    // A deterministic mixed pool: the six eligible residency exercises plus
    // four existing clinical exercises, never the anatomy of a different year.
    await db.query(`update competition.question_bank set active=
      (id=any($1::text[]) and coalesce(content->'studyYears' @> '[10]'::jsonb,false)) or id in (
        select id from competition.question_bank where not(content ? 'studyYears') order by id limit 4
      )`, [anatomyQuestions.map((question) => question.id)]);
    let match = await call(alice, "create", {
      mode: "duel",
      requestId: matchId,
    });
    assert.equal(match.question, null);
    await call(bob, "join", { code: match.code });
    await call(alice, "start", { matchId });
    await db.query(
      "update competition.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '5 minutes' where id=$1",
      [matchId],
    );
    const bank = (
      await db.query<{ questions: any[] }>(
        "select questions from competition.matches where id=$1",
        [matchId],
      )
    ).rows[0]!.questions;
    assert.equal(bank.filter((question) => question.fr.diagram).length, 6);
    assert.equal(
      bank.every(
        (question) => !question.studyYears || question.studyYears.includes(10),
      ),
      true,
    );
    for (let ordinal = 0; ordinal < 10; ordinal++) {
      match = await call(alice, "get", { matchId });
      assert.deepEqual(match.question.fr.diagram, bank[ordinal].fr.diagram);
      assert.deepEqual(match.question.en.diagram, bank[ordinal].en.diagram);
      assert.equal(match.question.fr.reasoning, undefined);
      assert.equal(match.question.en.reasoning, undefined);
      assert.equal(match.question.correct, undefined);
      assert.equal(match.review, undefined);
      await call(alice, "answer", {
        matchId,
        ordinal,
        choice: bank[ordinal].correct,
        score: 9999,
        correct: false,
        diagram: { structureId: "client-tampering" },
      });
    }
    for (let ordinal = 0; ordinal < 10; ordinal++)
      match = await call(bob, "answer", {
        matchId,
        ordinal,
        choice: (bank[ordinal].correct + 1) % 4,
      });
    assert.equal(match.status, "finished");
    assert.equal(
      match.players.find((player: any) => player.nickname === "Anatomy Alice")
        .score,
      10,
    );
    assert.equal(
      match.players.find((player: any) => player.nickname === "Anatomy Bob")
        .score,
      0,
    );
    assert.equal(match.review.length, 10);
    for (const answer of match.review) {
      assert.deepEqual(answer.fr.diagram, bank[answer.ordinal].fr.diagram);
      assert.deepEqual(answer.en.diagram, bank[answer.ordinal].en.diagram);
      assert.equal(answer.correctChoice, bank[answer.ordinal].correct);
      assert.equal(answer.fr.reasoning, bank[answer.ordinal].fr.reasoning);
    }
    assert.equal(
      (await call(alice, "leaderboard", { studyYear: 10 })).players.length,
      2,
    );
    assert.equal(
      (await call(alice, "leaderboard", { studyYear: 11 })).players.length,
      0,
    );
    await assert.rejects(
      call(alice, "profile", { nickname: "Anatomy Alice", studyYear: 11 }),
      /study_year_locked/,
    );
  } finally {
    await db.close();
  }
});
