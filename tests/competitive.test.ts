import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const carol = "33333333-3333-4333-8333-333333333333";
const matchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("competitive: private bank, server timer/grading, idempotent answer, two-player Elo and year isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to authenticated,anon,service_role;insert into auth.users values('${alice}'),('${bob}'),('${carol}');`);
    for (const filename of readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.exec(readFileSync(`supabase/migrations/${filename}`, "utf8"));
    }
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
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.exec("set local role anon");
        await tx.query("select public.competitive('list','{}')");
      }),
    );
    await assert.rejects(
      user(alice, (tx) => tx.query("select * from competition.question_bank")),
    );
    await assert.rejects(
      user(alice, (tx) => tx.query("select competition.settle($1)", [matchId])),
    );
    await assert.rejects(
      user(alice, (tx) =>
        tx.query(
          "insert into competition.profiles(user_id,nickname,study_year,season) values($1,'Fake',2,'2026-2027')",
          [alice],
        ),
      ),
    );
    await assert.rejects(
      call(alice, "create", { mode: "duel", requestId: matchId }),
      /profile_required/,
    );
    await call(alice, "profile", { nickname: "Alice", studyYear: 3 });
    await call(bob, "profile", { nickname: "Bob", studyYear: 3 });
    await call(carol, "profile", { nickname: "Carol", studyYear: 2 });
    let match = await call(alice, "create", {
      mode: "duel",
      requestId: matchId,
    });
    assert.equal(match.status, "waiting");
    assert.equal(match.question, null);
    assert.equal(match.players.length, 1);
    const retry = await call(alice, "create", {
      mode: "duel",
      requestId: matchId,
    });
    assert.equal(retry.id, matchId);
    assert.equal(
      (
        (await user(
          alice,
          async (tx) =>
            (await tx.query("select public.get_quiz_allowance() as a")).rows[0]
              .a,
        )) as any
      ).used,
      1,
    );
    await assert.rejects(call(carol, "get", { matchId }), /match_not_found/);
    await assert.rejects(
      call(alice, "start", { matchId }),
      /second_player_required/,
    );
    await assert.rejects(
      call(carol, "join", { code: match.code }),
      /study_year_mismatch/,
    );
    const joined = await call(bob, "join", { code: match.code });
    assert.equal(joined.players.length, 2);
    assert.equal(
      (await call(bob, "join", { code: match.code })).players.length,
      2,
    );
    await assert.rejects(
      call(carol, "join", { code: match.code }),
      /lobby_full/,
    );
    await assert.rejects(call(bob, "start", { matchId }), /host_required/);
    await assert.rejects(
      call(alice, "profile", { nickname: "Alice", studyYear: 4 }),
      /study_year_locked/,
    );
    match = await call(alice, "start", { matchId });
    assert.equal(match.status, "playing");
    assert.equal(
      Date.parse(match.endsAt) - Date.parse(match.startsAt) >= 180000,
      true,
    );
    await assert.rejects(
      call(alice, "answer", { matchId, ordinal: 0, choice: 0 }),
      /match_not_started/,
    );
    // Move the server clock window as privileged test setup; public clients cannot change this table.
    await db.query(
      "update competition.matches set starts_at=clock_timestamp()-interval '1 second',ends_at=clock_timestamp()+interval '60 seconds' where id=$1",
      [matchId],
    );
    match = await call(alice, "get", { matchId });
    assert.equal(match.question.fr.options.length, 4);
    assert.equal(match.question.fr.reasoning, undefined);
    assert.equal(match.question.correct, undefined);
    assert.equal(match.review, undefined);
    await assert.rejects(
      call(alice, "answer", { matchId, ordinal: 1, choice: 0 }),
      /answer_out_of_order/,
    );
    const bank = (
      await db.query<{ questions: any[] }>(
        "select questions from competition.matches where id=$1",
        [matchId],
      )
    ).rows[0]!.questions;
    // Alice gets all correct, Bob all incorrect. The request's fake score/time fields are ignored.
    for (let ordinal = 0; ordinal < 10; ordinal++) {
      const correct = bank[ordinal]!.correct;
      match = await call(alice, "answer", {
        matchId,
        ordinal,
        choice: correct,
        score: -999,
        answeredAt: "1990-01-01",
      });
      if (ordinal === 0) {
        const duplicate = await call(alice, "answer", {
          matchId,
          ordinal,
          choice: (correct + 1) % 4,
        });
        assert.equal(duplicate.ordinal, 1);
      }
      match = await call(bob, "answer", {
        matchId,
        ordinal,
        choice: (correct + 1) % 4,
        score: 999999,
      });
    }
    assert.equal(match.status, "finished");
    assert.equal(
      match.players.find((p: any) => p.nickname === "Alice").score,
      10,
    );
    assert.equal(match.players.find((p: any) => p.nickname === "Bob").score, 0);
    assert.equal(match.review.length, 10);
    assert.equal(match.review[0].correct, false);
    const aliceProfile = await call(alice, "profile");
    const bobProfile = await call(bob, "profile");
    assert.equal(aliceProfile.rating, 1012);
    assert.equal(bobProfile.rating, 988);
    assert.equal(aliceProfile.played, 1);
    await call(alice, "get", { matchId });
    await call(bob, "answer", { matchId, ordinal: 0, choice: 0 });
    assert.equal((await call(alice, "profile")).played, 1);
    await assert.rejects(
      call(alice, "profile", { nickname: "Alice", studyYear: 4 }),
      /study_year_locked/,
    );
    const leaderboard = await call(carol, "leaderboard", { studyYear: 3 });
    assert.equal(leaderboard.players.length, 2);
    assert.equal(leaderboard.players[0].nickname, "Alice");
    assert.equal(leaderboard.players[0].user_id, undefined);
    assert.equal(
      (await call(carol, "leaderboard", { studyYear: 2 })).players.length,
      0,
    );
    await assert.rejects(
      user(alice, (tx) =>
        tx.query(
          "update competition.matches set ends_at=now()+interval '1 day' where id=$1",
          [matchId],
        ),
      ),
    );
    await assert.rejects(
      user(alice, (tx) =>
        tx.query(
          "update competition.answers set correct=true where match_id=$1",
          [matchId],
        ),
      ),
    );
    // A deadline ends the next race even when neither player finished.
    const raceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let race = await call(alice, "create", { mode: "race", requestId: raceId });
    await call(bob, "join", { code: race.code });
    race = await call(alice, "start", { matchId: raceId });
    assert.equal(
      Date.parse(race.endsAt) - Date.parse(race.startsAt) >= 60000,
      true,
    );
    await db.query(
      "update competition.matches set starts_at=clock_timestamp()-interval '61 seconds',ends_at=clock_timestamp()-interval '1 second' where id=$1",
      [raceId],
    );
    race = await call(alice, "answer", {
      matchId: raceId,
      ordinal: 0,
      choice: 0,
    });
    assert.equal(race.status, "finished");
    assert.equal(race.ordinal, 0);
    assert.equal(race.ranked, false);
    assert.equal((await call(alice, "profile")).draws, 0);
    assert.equal((await call(alice, "profile")).played, 1);
    const thirdId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const third = await call(alice, "create", {
      mode: "duel",
      requestId: thirdId,
    });
    await call(alice, "cancel", { matchId: third.id });
    const denied = await call(alice, "create", {
      mode: "duel",
      requestId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });
    assert.equal(denied.quota.allowed, false);
    assert.equal(denied.quota.error, "daily_limit");
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from competition.matches",
        )
      ).rows[0]!.count,
      3,
    );
  } finally {
    await db.close();
  }
});
