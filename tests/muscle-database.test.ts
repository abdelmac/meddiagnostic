import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { muscleQuestions } from "../src/data/muscle-questions";
import { muscleQuestionsEn } from "../src/data/muscle-questions.en";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const carol = "33333333-3333-4333-8333-333333333333";
const duelId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("muscle bank: bilingual private grading, study-year selection, unchanged quotas and accepted activity timestamps", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth;create table auth.users(id uuid primary key);
      create role anon;create role authenticated;create role service_role bypassrls;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon,service_role;
      insert into auth.users values('${alice}'),('${bob}'),('${carol}');`);
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
    const call = async (
      id: string,
      command: string,
      payload = {},
    ): Promise<any> =>
      user(
        id,
        async (tx) =>
          (
            await tx.query("select public.competitive($1,$2) as result", [
              command,
              payload,
            ])
          ).rows[0].result,
      );
    const allowance = async (id: string): Promise<any> =>
      user(
        id,
        async (tx) =>
          (await tx.query("select public.get_quiz_allowance() as result"))
            .rows[0].result,
      );
    const ids = muscleQuestions.map((question) => question.id);
    const rows = (
      await db.query<{ id: string; version: number; content: any }>(
        "select id,version,content from competition.question_bank where id=any($1::text[])",
        [ids],
      )
    ).rows;
    assert.equal(rows.length, ids.length);
    for (const row of rows) {
      const fr = muscleQuestions.find((question) => question.id === row.id)!;
      const en = muscleQuestionsEn.find((question) => question.id === row.id)!;
      assert.ok(fr && en);
      assert.equal(row.version, fr.version);
      assert.equal(row.content.version, fr.version);
      assert.equal(row.content.correct, fr.correct);
      assert.equal(row.content.correct, en.correct);
      assert.equal(row.content.anatomyFocus, fr.anatomyFocus);
      assert.deepEqual(row.content.studyYears, fr.studyYears);
      assert.deepEqual(row.content.sources, fr.sources);
      assert.equal(row.content.medicalReviewer, null);
      for (const [language, source] of [
        ["fr", fr],
        ["en", en],
      ] as const) {
        assert.equal(row.content[language].title, source.title);
        assert.equal(row.content[language].context, source.context);
        assert.equal(row.content[language].reasoning, source.reasoning);
        assert.deepEqual(
          row.content[language].options,
          source.options.map((option) => option.label),
        );
        assert.deepEqual(row.content[language].diagram, source.diagram);
      }
    }
    await assert.rejects(
      user(alice, (tx) => tx.query("select * from competition.question_bank")),
    );
    await assert.rejects(
      user(alice, (tx) =>
        tx.query("select competition.snapshot($1,$2)", [duelId, bob]),
      ),
    );
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        return tx.query("select public.competitive('list','{}')");
      }),
    );
    // Exercise only the new bank, so an unrelated clinical question cannot hide
    // a broken year selector or accidentally supply the ten required questions.
    await db.query(
      "update competition.question_bank set active=(id=any($1::text[]))",
      [ids],
    );
    for (const year of [1, 6, 12]) {
      const eligible = muscleQuestions.filter((question) =>
        question.studyYears?.includes(year),
      );
      assert.ok(
        eligible.length >= 10,
        `At least ten muscle exercises are needed for study year ${year}`,
      );
      await call(alice, "profile", {
        nickname: "Muscle Alice",
        studyYear: year,
      });
      const requestId = `00000000-0000-4000-8000-${String(year).padStart(12, "0")}`;
      let match = await call(alice, "create", { mode: "duel", requestId });
      assert.equal(match.question, null);
      assert.deepEqual(match.activity, []);
      const bank = (
        await db.query<{ questions: any[] }>(
          "select questions from competition.matches where id=$1",
          [requestId],
        )
      ).rows[0]!.questions;
      assert.equal(bank.length, 10);
      assert.equal(new Set(bank.map((question) => question.id)).size, 10);
      for (const question of bank) {
        assert.ok(eligible.some((candidate) => candidate.id === question.id));
        assert.ok(question.studyYears.includes(year));
      }
      const used = (await allowance(alice)).used;
      match = await call(alice, "create", { mode: "duel", requestId });
      assert.equal(match.id, requestId);
      assert.equal((await allowance(alice)).used, used);
      await call(alice, "cancel", { matchId: requestId });
    }
    const blocked = await call(alice, "create", {
      mode: "duel",
      requestId: "00000000-0000-4000-8000-000000000099",
    });
    assert.equal(blocked.quota.error, "daily_limit");
    assert.equal((await allowance(alice)).used, 3);

    await call(bob, "profile", { nickname: "Muscle Bob", studyYear: 6 });
    await call(carol, "profile", { nickname: "Muscle Carol", studyYear: 6 });
    let match = await call(bob, "create", { mode: "race", requestId: duelId });
    await call(carol, "join", { code: match.code });
    await call(bob, "start", { matchId: duelId });
    await db.query(
      "update competition.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '5 minutes' where id=$1",
      [duelId],
    );
    const bank = (
      await db.query<{ questions: any[] }>(
        "select questions from competition.matches where id=$1",
        [duelId],
      )
    ).rows[0]!.questions;
    // Updating the catalog after a duel starts must not change its saved grading.
    await db.query(
      "update competition.question_bank set version=version+1,content=jsonb_set(content,'{correct}',to_jsonb(((content->>'correct')::integer+1)%4)) where id=$1",
      [bank[0].id],
    );
    for (let ordinal = 0; ordinal < 10; ordinal++) {
      match = await call(bob, "get", { matchId: duelId });
      assert.equal(match.question.fr.reasoning, undefined);
      assert.equal(match.question.en.reasoning, undefined);
      assert.equal(match.question.correct, undefined);
      assert.equal(match.review, undefined);
      assert.deepEqual(match.question.fr.diagram, bank[ordinal].fr.diagram);
      assert.deepEqual(match.question.en.diagram, bank[ordinal].en.diagram);
      match = await call(bob, "answer", {
        matchId: duelId,
        ordinal,
        choice: bank[ordinal].correct,
        score: 9999,
        correct: false,
      });
      assert.equal(match.activity.length, ordinal + 1);
      assert.ok(Number.isFinite(Date.parse(match.activity[ordinal].at)));
      assert.equal(match.activity[ordinal].ordinal, ordinal);
      assert.deepEqual(Object.keys(match.activity[ordinal]).sort(), [
        "at",
        "ordinal",
      ]);
      if (ordinal === 0) {
        const first = match.activity[0];
        const retried = await call(bob, "answer", {
          matchId: duelId,
          ordinal,
          choice: (bank[ordinal].correct + 1) % 4,
        });
        assert.deepEqual(retried.activity, [first]);
        assert.deepEqual(
          (await call(carol, "get", { matchId: duelId })).activity,
          [],
        );
      }
    }
    for (let ordinal = 0; ordinal < 10; ordinal++)
      match = await call(carol, "answer", {
        matchId: duelId,
        ordinal,
        choice: (bank[ordinal].correct + 1) % 4,
      });
    assert.equal(match.status, "finished");
    assert.equal(
      match.players.find((player: any) => player.nickname === "Muscle Bob")
        .score,
      10,
    );
    assert.equal(
      match.players.find((player: any) => player.nickname === "Muscle Carol")
        .score,
      0,
    );
    assert.equal(match.review.length, 10);
    for (const answer of match.review) {
      assert.equal(answer.correctChoice, bank[answer.ordinal].correct);
      assert.equal(answer.en.reasoning, bank[answer.ordinal].en.reasoning);
    }
    const bobFinal = await call(bob, "get", { matchId: duelId });
    assert.equal(bobFinal.activity.length, 10);
    const timestamp = (
      await db.query<{ at: string }>(
        "select answered_at::text as at from competition.answers where match_id=$1 and user_id=$2 and ordinal=0",
        [duelId, bob],
      )
    ).rows[0]!.at;
    assert.equal(Date.parse(bobFinal.activity[0].at), Date.parse(timestamp));
    assert.equal((await allowance(bob)).used, 1);
    assert.equal((await allowance(carol)).used, 1);
    await assert.rejects(
      call(alice, "get", { matchId: duelId }),
      /match_not_found/,
    );
  } finally {
    await db.close();
  }
});
