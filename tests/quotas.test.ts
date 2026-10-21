import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { guestAllowance, parisDay } from "../src/domain/quotas";
test("quota invité : minuit à Paris, y compris changements d’heure", () => {
  assert.equal(parisDay(new Date("2026-10-21T22:30:00Z")), "2026-10-22");
  assert.equal(guestAllowance([], new Date("2026-10-25T00:30:00Z")).resetsAt, "2026-10-25T23:00:00.000Z");
  assert.equal(guestAllowance([], new Date("2026-03-29T00:30:00Z")).resetsAt, "2026-03-29T22:00:00.000Z");
  assert.equal(guestAllowance([{ id: "old", count: 10, day: "2026-10-20" }], new Date("2026-10-21T12:00:00Z")).remaining, 3);
});
test("quota serveur : idempotence, 3 sessions, maximum10, isolation et seul Premium production déplafonné", async () => {
  const db = new PGlite();
  const alice = "11111111-1111-4111-8111-111111111111", bob = "22222222-2222-4222-8222-222222222222";
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon,service_role;insert into auth.users values('${alice}'),('${bob}');`);
  for (const file of readdirSync("supabase/migrations").filter((f) => /accounts_and_subscriptions|usage_quotas/.test(f)).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  const as = <T,>(user: string, action: (tx: any) => Promise<T>) => db.transaction(async (tx) => {
    await tx.exec(`set local role authenticated;select set_config('request.jwt.claim.sub','${user}',true);`); return action(tx);
  });
  let counter = 0;
  const reserve = async (user: string, count: number, id = `00000000-0000-4000-8000-${String(++counter).padStart(12,"0")}`) => {
    const result: any = await as(user, (tx) => tx.query("select public.reserve_quiz_session($1,$2) as result", [id, count])); return { ...result.rows[0].result, id };
  };
  const first = await reserve(alice, 10);
  assert.equal(first.allowed, true); assert.equal(first.used, 1); assert.equal(first.remaining, 2);
  assert.equal((await reserve(alice, 10, first.id)).used, 1);
  await assert.rejects(reserve(alice, 5, first.id));
  assert.equal((await reserve(alice, 20)).error, "question_limit");
  await reserve(alice, 5); await reserve(alice, 10);
  assert.equal((await reserve(alice, 5)).error, "daily_limit");
  assert.equal((await reserve(bob, 5)).used, 1);
  await assert.rejects(as(alice, (tx) => tx.query("delete from private.quiz_reservations")));
  await db.exec(`insert into public.subscription_entitlements(user_id,active,environment,expires_at) values('${alice}',true,'SANDBOX',now()+interval '1day')`);
  assert.equal((await reserve(alice, 5)).error, "daily_limit");
  await db.exec(`update public.subscription_entitlements set environment='PRODUCTION' where user_id='${alice}'`);
  for (let i = 0; i < 5; i++) assert.equal((await reserve(alice, 30)).allowed, true);
  await db.exec(`update public.subscription_entitlements set expires_at=now()-interval '1 second' where user_id='${alice}'`);
  assert.equal((await reserve(alice, 5)).error, "daily_limit");
  const retried = await reserve(alice, 10, first.id); assert.equal(retried.allowed, true);
  await assert.rejects(db.transaction(async (tx) => { await tx.exec("set local role anon"); return tx.query("select public.get_quiz_allowance()"); }));
  await db.close();
});
