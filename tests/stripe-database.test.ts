import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

test("Stripe SQL : données privées, correspondance immuable et lease anti-doublons isolée par utilisateur", async () => {
  const db = new PGlite();
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  const lease1 = "11111111-2222-4333-8444-555555555555";
  const lease2 = "22222222-2222-4333-8444-555555555555";
  try {
    await db.exec(
      `create schema auth;create schema private;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema private to service_role;insert into auth.users values('${alice}'),('${bob}');`,
    );
    await db.exec(
      readFileSync(
        "supabase/migrations/20261021142534_stripe_customer_mapping_and_checkout_leases.sql",
        "utf8",
      ),
    );
    const service = async <T>(fn: (tx: any) => Promise<T>) =>
      db.transaction(async (tx) => {
        await tx.exec("set local role service_role");
        return fn(tx);
      });
    const call = async (sql: string, args: unknown[]) =>
      (await service((tx) => tx.query(sql, args))) as any;
    const attemptQuery =
      "select public.stripe_checkout_attempt($1,'PRODUCTION',$2,$3,$4) as value";
    const first = (
      await call(attemptQuery, [alice, "price_Month", "fr", false])
    ).rows[0].value;
    const retry = (await call(attemptQuery, [alice, "price_Year", "en", false]))
      .rows[0].value;
    assert.deepEqual(
      retry,
      first,
      "a lost Stripe response retains its exact original idempotency identity",
    );
    await call(
      "select public.save_stripe_checkout($1,'PRODUCTION',$2,'cs_Alice')",
      [alice, first.attemptId],
    );
    assert.equal(
      (await call(attemptQuery, [alice, "price_Month", "fr", false])).rows[0]
        .value.sessionId,
      "cs_Alice",
    );
    const replacement = (
      await call(attemptQuery, [alice, "price_Year", "en", true])
    ).rows[0].value;
    assert.notEqual(replacement.attemptId, first.attemptId);
    assert.equal(replacement.priceId, "price_Year");
    assert.equal(replacement.sessionId, null);
    assert.equal(
      (
        await call(
          "select public.put_stripe_customer($1,'PRODUCTION','cus_Alice') as value",
          [alice],
        )
      ).rows[0].value,
      "cus_Alice",
    );
    assert.equal(
      (
        await call(
          "select public.put_stripe_customer($1,'PRODUCTION','cus_Overwrite') as value",
          [alice],
        )
      ).rows[0].value,
      "cus_Alice",
    );
    assert.equal(
      (
        await call("select public.get_stripe_customer($1,'SANDBOX') as value", [
          alice,
        ])
      ).rows[0].value,
      null,
    );
    assert.equal(
      (
        await call(
          "select public.stripe_account_for_customer('cus_Alice','PRODUCTION') as value",
          [],
        )
      ).rows[0].value,
      alice,
    );
    assert.equal(
      (
        await call(
          "select public.acquire_stripe_billing($1,'PRODUCTION',$2) as value",
          [alice, lease1],
        )
      ).rows[0].value,
      true,
    );
    assert.equal(
      (
        await call(
          "select public.acquire_stripe_billing($1,'PRODUCTION',$2) as value",
          [alice, lease2],
        )
      ).rows[0].value,
      false,
    );
    assert.equal(
      (
        await call(
          "select public.acquire_stripe_billing($1,'PRODUCTION',$2) as value",
          [bob, lease2],
        )
      ).rows[0].value,
      true,
    );
    await call("select public.release_stripe_billing($1,'PRODUCTION',$2)", [
      alice,
      lease2,
    ]);
    assert.equal(
      (
        await call(
          "select public.acquire_stripe_billing($1,'PRODUCTION',$2) as value",
          [alice, lease2],
        )
      ).rows[0].value,
      false,
    );
    await call("select public.release_stripe_billing($1,'PRODUCTION',$2)", [
      alice,
      lease1,
    ]);
    assert.equal(
      (
        await call(
          "select public.acquire_stripe_billing($1,'PRODUCTION',$2) as value",
          [alice, lease2],
        )
      ).rows[0].value,
      true,
    );
    for (const role of ["anon", "authenticated"])
      for (const sql of [
        "select * from private.stripe_customers",
        "select * from private.stripe_billing_leases",
        `select public.get_stripe_customer('${alice}','PRODUCTION')`,
        `select public.acquire_stripe_billing('${alice}','PRODUCTION','${lease1}')`,
      ])
        await assert.rejects(
          db.transaction(async (tx) => {
            await tx.exec(`set local role ${role}`);
            return tx.query(sql);
          }),
        );
  } finally {
    await db.close();
  }
});
