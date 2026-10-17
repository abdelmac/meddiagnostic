import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
test("PostgreSQL : isolation RLS, CAS concurrent, Premium non modifiable et événements idempotents", async () => {
  const db = new PGlite();
  await db.exec(
    `create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon,service_role;insert into auth.users values('${alice}'),('${bob}');`,
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261017143433_accounts_and_subscriptions.sql",
      "utf8",
    ),
  );
  const asUser = async <T>(id: string, fn: (db: any) => Promise<T>) =>
    db.transaction(async (tx) => {
      await tx.exec(
        `set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);`,
      );
      return fn(tx);
    });
  assert.equal(
    Number(
      (
        (await asUser(alice, (tx) =>
          tx.query("select public.save_progress(0,'{\"schema\":1}') as v"),
        )) as any
      ).rows[0].v,
    ),
    1,
  );
  assert.equal(
    (
      (await asUser(bob, (tx) =>
        tx.query("select * from public.progress_snapshots"),
      )) as any
    ).rows.length,
    0,
  );
  await assert.rejects(
    asUser(bob, (tx) =>
      tx.query(
        "insert into public.progress_snapshots(user_id,version,payload) values($1,1,$2)",
        [alice, { schema: 1 }],
      ),
    ),
  );
  const changed = await asUser(bob, (tx) =>
    tx.query(
      "update public.progress_snapshots set user_id=$1 where user_id=$2 returning *",
      [bob, alice],
    ),
  );
  assert.equal((changed as any).rows.length, 0);
  assert.equal(
    Number(
      (
        (await asUser(alice, (tx) =>
          tx.query(
            'select public.save_progress(1,\'{"schema":1,"updated":true}\') as v',
          ),
        )) as any
      ).rows[0].v,
    ),
    2,
  );
  assert.equal(
    (
      (await asUser(alice, (tx) =>
        tx.query("select public.save_progress(1,'{\"schema\":1}') as v"),
      )) as any
    ).rows[0].v,
    null,
  );
  await assert.rejects(
    asUser(alice, (tx) =>
      tx.query(
        "insert into public.subscription_entitlements(user_id,active,environment) values($1,true,'SANDBOX')",
        [alice],
      ),
    ),
  );
  await assert.rejects(
    asUser(alice, (tx) =>
      tx.query(
        "select public.apply_payment_event('fake',$1,1,true,now()+interval '1 day','stripe')",
        [alice],
      ),
    ),
  );
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    const params = [
      "event-1",
      alice,
      100,
      true,
      "2026-12-01T00:00:00Z",
      "STRIPE",
    ];
    assert.equal(
      (
        await tx.query<{ apply_payment_event: boolean }>(
          "select public.apply_payment_event($1,$2,$3,$4,$5,$6)",
          params,
        )
      ).rows[0]!.apply_payment_event,
      true,
    );
    assert.equal(
      (
        await tx.query<{ apply_payment_event: boolean }>(
          "select public.apply_payment_event($1,$2,$3,$4,$5,$6)",
          params,
        )
      ).rows[0]!.apply_payment_event,
      false,
    );
    await tx.query(
      "select public.apply_payment_event('refund',$1,200,false,null,'STRIPE')",
      [alice],
    );
    await tx.query(
      "select public.apply_payment_event('late-initial',$1,50,true,now()+interval '1 day','STRIPE')",
      [alice],
    );
  });
  const ent = (
    (await asUser(alice, (tx) =>
      tx.query("select * from public.subscription_entitlements"),
    )) as any
  ).rows;
  assert.equal(ent.length, 1);
  assert.equal(ent[0].active, false);
  assert.equal(
    (
      (await asUser(bob, (tx) =>
        tx.query("select * from public.subscription_entitlements"),
      )) as any
    ).rows.length,
    0,
  );
  await db.close();
});
