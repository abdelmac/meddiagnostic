import Stripe from "npm:stripe@23.0.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import {
  stripeEntitlement,
  stripePlan,
} from "../../../src/domain/stripe-entitlements.ts";

export const SITE = "https://medquiz-europe.medcompass-web.workers.dev";
export type Billing = NonNullable<ReturnType<typeof billing>>;
export function billing() {
  const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const monthly = Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "";
  const yearly = Deno.env.get("STRIPE_PRICE_YEARLY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (
    !/^(sk|rk)_(test|live)_/.test(key) ||
    !/^price_[A-Za-z0-9]+$/.test(monthly) ||
    !/^price_[A-Za-z0-9]+$/.test(yearly) ||
    monthly === yearly ||
    !webhookSecret.startsWith("whsec_")
  )
    return null;
  const live = /^(sk|rk)_live_/.test(key);
  return {
    stripe: new Stripe(key, {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 1,
      timeout: 10000,
    }),
    prices: { monthly, yearly },
    live,
    environment: live ? ("PRODUCTION" as const) : ("SANDBOX" as const),
    webhookSecret,
  };
}

export async function rpc<T>(
  client: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw Error("database_unavailable");
  return data as T;
}

export async function plans(config: Billing) {
  const [monthly, yearly] = await Promise.all([
    config.stripe.prices.retrieve(config.prices.monthly),
    config.stripe.prices.retrieve(config.prices.yearly),
  ]);
  return [
    stripePlan(monthly, "monthly", config.live),
    stripePlan(yearly, "yearly", config.live),
  ];
}

export function customerId(
  client: SupabaseClient,
  userId: string,
  config: Billing,
) {
  return rpc<string | null>(client, "get_stripe_customer", {
    account_id: userId,
    billing_environment: config.environment,
  });
}

export async function withBillingLease<T>(
  client: SupabaseClient,
  userId: string,
  config: Billing,
  work: () => Promise<T>,
) {
  const lease = crypto.randomUUID();
  const args = {
    account_id: userId,
    billing_environment: config.environment,
    requested_lease: lease,
  };
  if (!(await rpc<boolean>(client, "acquire_stripe_billing", args)))
    throw Error("billing_busy");
  try {
    return await work();
  } finally {
    await rpc(client, "release_stripe_billing", args);
  }
}

export async function getSubscriptions(config: Billing, customer: string) {
  const result = await config.stripe.subscriptions.list({
    customer,
    limit: 100,
    expand: ["data.latest_invoice"],
  });
  // More than 100 concurrently non-cancelled subscriptions is an abnormal
  // account state. Fail closed rather than guessing or permitting a duplicate.
  if (result.has_more) throw Error("too_many_subscriptions");
  return result.data;
}

export async function synchronizeStripe(
  client: SupabaseClient,
  userId: string,
  config: Billing,
  customer: string | null,
  eventId = `stripe-status:${crypto.randomUUID()}`,
) {
  const observedAt = Date.now();
  const subscriptions = customer
    ? await getSubscriptions(config, customer)
    : [];
  const entitlement = stripeEntitlement(
    subscriptions,
    Object.values(config.prices),
    config.live,
  );
  await rpc(client, "apply_payment_event", {
    event_id: eventId,
    account_id: userId,
    event_time: observedAt,
    entitlement_active: entitlement.active,
    entitlement_expiry: entitlement.expiresAt,
    entitlement_store: "STRIPE",
    entitlement_environment: config.environment,
  });
  return { ...entitlement, subscriptions };
}

export function safeStripeURL(
  raw: string | null | undefined,
  host: "checkout.stripe.com" | "billing.stripe.com",
) {
  if (!raw) throw Error("provider_unavailable");
  const url = new URL(raw);
  if (
    url.protocol !== "https:" ||
    url.hostname !== host ||
    url.username ||
    url.password
  )
    throw Error("provider_unavailable");
  return raw;
}
