import { authenticated, json, subscriber } from "../_shared/server.ts";
import { sandboxEntitlement } from "../../../src/domain/entitlements.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, {});
  if (req.method !== "POST")
    return json(req, { error: "method_not_allowed" }, 405);
  try {
    const { client, user } = await authenticated(req);
    if (!Deno.env.get("REVENUECAT_SECRET_KEY"))
      return json(req, {
        available: false,
        active: false,
        environment: "SANDBOX",
      });
    const canonical = await subscriber(user.id);
    const entitlement = sandboxEntitlement(canonical);
    // Verified from the provider on every request; client payloads cannot grant access.
    return json(req, {
      available: true,
      ...entitlement,
      environment: "SANDBOX",
    });
  } catch (error) {
    return json(
      req,
      {
        error:
          error instanceof Error && error.message === "unauthorized"
            ? "unauthorized"
            : "temporarily_unavailable",
      },
      error instanceof Error && error.message === "unauthorized" ? 401 : 503,
    );
  }
});
