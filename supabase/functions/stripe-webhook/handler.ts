import Stripe from "npm:stripe@23.0.0";
import { admin } from "../_shared/server.ts";
import {
  billing,
  rpc,
  synchronizeStripe,
  withBillingLease,
} from "../_shared/stripe.ts";

const relevant = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);
export async function handler(req: Request) {
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  if (req.method !== "POST") return reply({ error: "method" }, 405);
  const config = billing();
  if (!config) return reply({ error: "not_configured" }, 503);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return reply({ error: "invalid_signature" }, 400);
  const raw = await req.text();
  if (raw.length > 1024 * 1024) return reply({ error: "body_too_large" }, 413);
  let event: Stripe.Event;
  try {
    event = await config.stripe.webhooks.constructEventAsync(
      raw,
      signature,
      config.webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return reply({ error: "invalid_signature" }, 400);
  }
  if (event.livemode !== config.live || !relevant.has(event.type))
    return reply({ received: true, ignored: true });
  const object = event.data.object as unknown as {
    customer?: string | { id: string } | null;
  };
  const customer =
    typeof object.customer === "string" ? object.customer : object.customer?.id;
  if (!customer || !/^cus_[A-Za-z0-9]+$/.test(customer))
    return reply({ received: true, ignored: true });
  try {
    const client = admin();
    // Trust only the server-owned mapping, never event metadata or emails.
    const userId = await rpc<string | null>(
      client,
      "stripe_account_for_customer",
      { stripe_customer_id: customer, billing_environment: config.environment },
    );
    if (!userId) return reply({ received: true, ignored: true });
    await withBillingLease(client, userId, config, () =>
      synchronizeStripe(client, userId, config, customer, `stripe:${event.id}`),
    );
    return reply({ received: true });
  } catch {
    return reply({ error: "retry" }, 503);
  }
}
