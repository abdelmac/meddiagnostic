import { strict as assert } from "node:assert";
import { handler as billing } from "../stripe-billing/handler.ts";
import { handler as webhook } from "../stripe-webhook/handler.ts";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const attempt = "33333333-3333-4333-8333-333333333333";
const webhookSecret = "whsec_medquiz_local_test_only";
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "request-id": "req_localtest",
    },
  });
}
async function fixture(
  work: (
    calls: {
      url: URL;
      init: RequestInit;
      body: Record<string, unknown> | URLSearchParams | null;
    }[],
    controls: { locked: boolean; active: boolean },
  ) => Promise<void>,
) {
  const savedFetch = globalThis.fetch;
  const controls = { locked: false, active: false };
  const calls: {
    url: URL;
    init: RequestInit;
    body: Record<string, unknown> | URLSearchParams | null;
  }[] = [];
  const variables = {
    STRIPE_SECRET_KEY: "sk_test_medquiz_local_test_only",
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_PRICE_MONTHLY: "price_Month",
    STRIPE_PRICE_YEARLY: "price_Year",
    SUPABASE_URL: "https://supabase.localtest",
    SUPABASE_SERVICE_ROLE_KEY: "local-service-key",
  };
  const saved = Object.fromEntries(
    Object.keys(variables).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(variables))
    Deno.env.set(key, value);
  globalThis.fetch = (async (
    input: Request | URL | string,
    init: RequestInit = {},
  ) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const isStripe = url.hostname === "api.stripe.com";
    const raw = typeof init.body === "string" ? init.body : "";
    const body = raw
      ? isStripe
        ? new URLSearchParams(raw)
        : JSON.parse(raw)
      : null;
    calls.push({ url, init, body });
    if (url.hostname === "supabase.localtest") {
      if (url.pathname === "/auth/v1/user")
        return response({
          id: alice,
          email: "alice@example.invalid",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: "2026-10-21T00:00:00Z",
        });
      const rpc = url.pathname.split("/").at(-1);
      if (rpc === "get_stripe_customer") return response("cus_Alice");
      if (rpc === "stripe_account_for_customer") return response(alice);
      if (rpc === "acquire_stripe_billing") return response(!controls.locked);
      if (rpc === "release_stripe_billing" || rpc === "save_stripe_checkout")
        return response(null);
      if (rpc === "apply_payment_event") return response(true);
      if (rpc === "stripe_checkout_attempt")
        return response({
          attemptId: attempt,
          priceId: "price_Month",
          language: "fr",
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          sessionId: null,
        });
    }
    if (isStripe) {
      if (url.pathname.startsWith("/v1/prices/")) {
        const yearly = url.pathname.endsWith("price_Year");
        return response({
          id: yearly ? "price_Year" : "price_Month",
          object: "price",
          active: true,
          livemode: false,
          currency: "eur",
          unit_amount: yearly ? 2500 : 500,
          billing_scheme: "per_unit",
          tax_behavior: "inclusive",
          recurring: {
            interval: yearly ? "year" : "month",
            interval_count: 1,
            usage_type: "licensed",
          },
        });
      }
      if (url.pathname === "/v1/subscriptions")
        return response({
          object: "list",
          has_more: false,
          data: controls.active
            ? [
                {
                  id: "sub_Alice",
                  object: "subscription",
                  customer: "cus_Alice",
                  status: "active",
                  livemode: false,
                  latest_invoice: { status: "paid" },
                  items: {
                    data: [
                      {
                        price: { id: "price_Month" },
                        current_period_end:
                          Math.floor(Date.now() / 1000) + 3600,
                      },
                    ],
                  },
                },
              ]
            : [],
        });
      if (
        url.pathname === "/v1/checkout/sessions" &&
        (!init.method || init.method === "GET")
      )
        return response({ object: "list", has_more: false, data: [] });
      if (url.pathname === "/v1/checkout/sessions" && init.method === "POST")
        return response({
          id: "cs_test_Alice",
          object: "checkout.session",
          url: "https://checkout.stripe.com/c/pay/cs_test_Alice",
        });
    }
    throw Error(
      `Unexpected request in isolated test: ${url.origin}${url.pathname}`,
    );
  }) as typeof fetch;
  try {
    await work(calls, controls);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
  }
}
const request = (body: unknown, authenticated = true) =>
  new Request("https://functions.localtest/stripe-billing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Authorization: "Bearer local-user-token" } : {}),
    },
    body: JSON.stringify(body),
  });

Deno.test(
  "Stripe handlers: anonymous catalog, authenticated status and exact selected prices",
  async () => {
    await fixture(async (calls) => {
      const publicPlans = await billing(request({ action: "plans" }, false));
      assert.equal(publicPlans.status, 200);
      const data = await publicPlans.json();
      assert.equal(data.environment, "SANDBOX");
      assert.deepEqual(
        data.plans.map((plan: { amount: number }) => plan.amount),
        [500, 2500],
      );
      assert.equal(
        calls.some((call) => call.url.hostname === "supabase.localtest"),
        false,
      );
      assert.equal(
        (await billing(request({ action: "checkout", plan: "monthly" }, false)))
          .status,
        401,
      );
    });
  },
);

Deno.test(
  "Stripe checkout ignores attacker prices and identities, uses persisted provider idempotency",
  async () => {
    await fixture(async (calls) => {
      const result = await billing(
        request({
          action: "checkout",
          plan: "monthly",
          language: "fr",
          customer: "cus_Attacker",
          account_id: bob,
          price: "price_Attacker",
          amount: 1,
        }),
      );
      assert.equal(result.status, 200);
      const create = calls.find(
        (call) =>
          call.url.pathname === "/v1/checkout/sessions" &&
          call.init.method === "POST",
      )!;
      const form = create.body as URLSearchParams;
      assert.equal(form.get("customer"), "cus_Alice");
      assert.equal(form.get("line_items[0][price]"), "price_Month");
      assert.equal(form.get("client_reference_id"), alice);
      assert.equal(
        new Headers(create.init.headers).get("idempotency-key"),
        `medquiz-checkout:${attempt}`,
      );
      const snapshot = calls.find((call) =>
        call.url.pathname.endsWith("apply_payment_event"),
      )!.body as Record<string, unknown>;
      assert.equal(snapshot.account_id, alice);
      assert.equal(
        snapshot.entitlement_active,
        false,
        "checkout creation never grants Premium",
      );
    });
  },
);

Deno.test(
  "Stripe checkout lease and existing subscriptions prevent duplicate purchases",
  async () => {
    await fixture(async (calls, controls) => {
      controls.locked = true;
      assert.equal(
        (await billing(request({ action: "checkout", plan: "monthly" })))
          .status,
        409,
      );
      controls.locked = false;
      controls.active = true;
      const blocked = await billing(
        request({ action: "checkout", plan: "monthly" }),
      );
      assert.equal(blocked.status, 409);
      assert.equal((await blocked.json()).error, "subscription_exists");
      assert.equal(
        calls.some((call) => call.url.pathname === "/v1/checkout/sessions"),
        false,
      );
    });
  },
);

async function signature(raw: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${raw}`),
  );
  const hex = [...new Uint8Array(signed)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}
Deno.test(
  "Stripe webhook verifies raw bytes and trusted mapping then re-fetches current state",
  async () => {
    await fixture(async (calls, controls) => {
      const raw = JSON.stringify({
        id: "evt_Local",
        object: "event",
        type: "customer.subscription.deleted",
        created: 1,
        livemode: false,
        data: {
          object: {
            id: "sub_DeletedOld",
            customer: "cus_Alice",
            metadata: { medquiz_user_id: bob },
          },
        },
      });
      const signed = await signature(raw);
      const post = (body: string, header?: string) =>
        new Request("https://functions.localtest/stripe-webhook", {
          method: "POST",
          headers: header ? { "stripe-signature": header } : {},
          body,
        });
      assert.equal((await webhook(post(raw))).status, 400);
      assert.equal((await webhook(post(raw + " ", signed))).status, 400);
      assert.equal(
        calls.length,
        0,
        "unverified events cannot access the database or provider",
      );
      controls.active = true;
      assert.equal((await webhook(post(raw, signed))).status, 200);
      const snapshot = calls.find((call) =>
        call.url.pathname.endsWith("apply_payment_event"),
      )!.body as Record<string, unknown>;
      assert.equal(snapshot.account_id, alice);
      assert.equal(snapshot.event_id, "stripe:evt_Local");
      assert.equal(
        snapshot.entitlement_active,
        true,
        "late deletion event cannot overwrite current paid subscription",
      );
      assert.ok(
        Number(snapshot.event_time) > 1_000_000,
        "ordering uses canonical observation time, not stale event.created",
      );
      assert.equal(snapshot.entitlement_environment, "SANDBOX");
    });
  },
);
