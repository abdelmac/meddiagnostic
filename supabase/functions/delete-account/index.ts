import { authenticated, json } from "../_shared/server.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(req, {});
  if (req.method !== "POST")
    return json(req, { error: "method_not_allowed" }, 405);
  try {
    const { client, user, token } = await authenticated(req);
    if (
      !user.last_sign_in_at ||
      Date.now() - Date.parse(user.last_sign_in_at) > 600000
    )
      return json(req, { error: "recent_sign_in_required" }, 403);
    const body = await req.json();
    if (body.confirm !== "DELETE")
      return json(req, { error: "confirmation_required" }, 400);
    const { data: ent, error: entError } = await client
      .from("subscription_entitlements")
      .select("active,expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (entError) throw entError;
    if (ent?.active && Date.parse(ent.expires_at) > Date.now())
      return json(req, { error: "manage_subscription_first" }, 409);
    const { error: revoke } = await client.auth.admin.signOut(token, "global");
    if (revoke) throw revoke;
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json(req, { deleted: true });
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
