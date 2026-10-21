import { authenticated, cors, json } from "../_shared/server.ts";
import {
  billing,
  customerId,
  plans,
  rpc,
  safeStripeURL,
  SITE,
  synchronizeStripe,
  withBillingLease,
} from "../_shared/stripe.ts";

export async function handler(req: Request) {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method" }, 405);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return json(req, { error: "body_too_large" }, 413);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw Error();
    body = parsed;
  } catch {
    return json(req, { error: "invalid_request" }, 400);
  }
  const action = body.action;
  if (
    !["plans", "status", "refresh", "checkout", "portal"].includes(
      String(action),
    )
  )
    return json(req, { error: "invalid_action" }, 400);
  try {
    // Public catalog never creates a customer or reveals an account status.
    const identity = action === "plans" ? null : await authenticated(req);
    const config = billing();
    if (!config)
      return json(req, {
        available: false,
        environment: "SANDBOX",
        active: false,
        expiresAt: null,
        plans: [],
      });
    const catalog = await plans(config);
    const base = {
      available: true,
      environment: config.environment,
      plans: catalog,
    };
    if (!identity) return json(req, base);
    const { client, user } = identity;
    const language = body.language === "en" ? "en" : "fr";
    return await withBillingLease(client, user.id, config, async () => {
      let customer = await customerId(client, user.id, config);
      if (action === "portal") {
        if (!customer) return json(req, { error: "no_subscription" }, 409);
        const portal = await config.stripe.billingPortal.sessions.create({
          customer,
          return_url: `${SITE}/?lang=${language}&billing=return`,
          locale: language,
        });
        return json(req, {
          ...base,
          url: safeStripeURL(portal.url, "billing.stripe.com"),
        });
      }
      const state = await synchronizeStripe(client, user.id, config, customer);
      const status = {
        ...base,
        active: state.active,
        expiresAt: state.expiresAt,
        canManage: customer !== null,
      };
      if (action === "status" || action === "refresh") return json(req, status);
      const plan = body.plan;
      if (plan !== "monthly" && plan !== "yearly")
        return json(req, { error: "invalid_plan" }, 400);
      const duplicate = state.subscriptions.some(
        (subscription) =>
          subscription.items.data.some((item) =>
            Object.values(config.prices).includes(item.price.id),
          ) &&
          !["canceled", "incomplete_expired"].includes(subscription.status),
      );
      if (duplicate)
        return json(req, { ...status, error: "subscription_exists" }, 409);
      if (!customer) {
        const created = await config.stripe.customers.create(
          {
            email: user.email,
            metadata: { medquiz_user_id: user.id, medquiz_app: "medquiz" },
            preferred_locales: [language],
          },
          {
            idempotencyKey: `medquiz-customer:${config.environment}:${user.id}`,
          },
        );
        customer = await rpc<string>(client, "put_stripe_customer", {
          account_id: user.id,
          billing_environment: config.environment,
          stripe_customer_id: created.id,
        });
      }
      const open = await config.stripe.checkout.sessions.list({
        customer,
        status: "open",
        limit: 100,
      });
      if (open.has_more) throw Error("too_many_checkouts");
      const medquizOpen = open.data.filter(
        (session) =>
          session.mode === "subscription" &&
          session.metadata?.medquiz_app === "medquiz",
      );
      if (medquizOpen.length > 1) throw Error("too_many_checkouts");
      let replaceAttempt = false;
      for (const session of medquizOpen) {
        if (
          session.metadata?.medquiz_price === config.prices[plan] &&
          session.url &&
          session.expires_at * 1000 > Date.now()
        )
          return json(req, {
            ...status,
            url: safeStripeURL(session.url, "checkout.stripe.com"),
          });
        await config.stripe.checkout.sessions.expire(session.id);
        replaceAttempt = true;
      }
      const attemptArgs = {
        account_id: user.id,
        billing_environment: config.environment,
        requested_price: config.prices[plan],
        requested_language: language,
      };
      type Attempt = {
        attemptId: string;
        priceId: string;
        language: "fr" | "en";
        expiresAt: number;
        sessionId: string | null;
      };
      let attempt = await rpc<Attempt>(client, "stripe_checkout_attempt", {
        ...attemptArgs,
        replace_attempt: replaceAttempt,
      });
      if (attempt.sessionId && !replaceAttempt) {
        const existing = await config.stripe.checkout.sessions.retrieve(
          attempt.sessionId,
        );
        if (existing.status === "complete")
          return json(req, { ...status, error: "subscription_pending" }, 409);
        if (existing.status === "open")
          return json(req, {
            ...status,
            url: safeStripeURL(existing.url, "checkout.stripe.com"),
          });
        attempt = await rpc<Attempt>(client, "stripe_checkout_attempt", {
          ...attemptArgs,
          replace_attempt: true,
        });
      }
      // A previous timed-out request must be recovered with its original plan.
      if (attempt.priceId !== config.prices[plan])
        return json(req, { ...status, error: "checkout_pending" }, 409);
      const checkout = await config.stripe.checkout.sessions.create(
        {
          mode: "subscription",
          customer,
          client_reference_id: user.id,
          line_items: [{ price: config.prices[plan], quantity: 1 }],
          locale: attempt.language,
          success_url: `${SITE}/?lang=${attempt.language}&billing=success`,
          cancel_url: `${SITE}/?lang=${attempt.language}&billing=cancel`,
          expires_at: attempt.expiresAt,
          metadata: {
            medquiz_app: "medquiz",
            medquiz_price: config.prices[plan],
          },
          subscription_data: {
            metadata: { medquiz_app: "medquiz", medquiz_user_id: user.id },
          },
        },
        { idempotencyKey: `medquiz-checkout:${attempt.attemptId}` },
      );
      await rpc(client, "save_stripe_checkout", {
        account_id: user.id,
        billing_environment: config.environment,
        requested_attempt: attempt.attemptId,
        checkout_session: checkout.id,
      });
      return json(req, {
        ...status,
        url: safeStripeURL(checkout.url, "checkout.stripe.com"),
      });
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "provider_unavailable";
    if (message === "unauthorized")
      return json(req, { error: "unauthorized" }, 401);
    if (message === "billing_busy")
      return json(req, { error: "billing_busy" }, 409);
    // Do not return provider messages, keys, customer IDs or billing details.
    return json(req, { error: "billing_unavailable" }, 503);
  }
}
