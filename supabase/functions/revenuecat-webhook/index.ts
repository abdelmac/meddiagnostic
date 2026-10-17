import { admin, json, subscriber } from "../_shared/server.ts";
import { sandboxEntitlement } from "../../../src/domain/entitlements.ts";
function equal(a: string, b: string) {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return mismatch === 0;
}
Deno.serve(async (req) => {
  if (req.method !== "POST")
    return json(req, { error: "method_not_allowed" }, 405);
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION");
  if (!secret || !equal(req.headers.get("Authorization") ?? "", secret))
    return json(req, { error: "unauthorized" }, 401);
  try {
    const body = await req.text();
    if (body.length > 65536) return json(req, { error: "too_large" }, 413);
    const { event } = JSON.parse(body);
    if (event?.type === "TEST") return json(req, { received: true });
    if (event?.environment !== "SANDBOX") return json(req, { ignored: true });
    if (
      typeof event.id !== "string" ||
      event.id.length > 200 ||
      !Number.isSafeInteger(event.event_timestamp_ms) ||
      !/^\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b$/i.test(
        event.app_user_id,
      )
    )
      return json(req, { error: "invalid_event" }, 400);
    const client = admin();
    // The atomic RPC below remains authoritative if deliveries race.
    const entitlement = sandboxEntitlement(await subscriber(event.app_user_id));
    const { error } = await client.rpc("apply_payment_event", {
      event_id: event.id,
      account_id: event.app_user_id,
      event_time: event.event_timestamp_ms,
      entitlement_active: entitlement.active,
      entitlement_expiry: entitlement.expiresAt,
      entitlement_store: entitlement.store,
    });
    if (error) throw error;
    return json(req, { received: true });
  } catch {
    return json(req, { error: "temporarily_unavailable" }, 503);
  }
});
