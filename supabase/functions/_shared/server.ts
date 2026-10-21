import { createClient } from "npm:@supabase/supabase-js@2.118.0";
const origin = "https://medquiz-europe.medcompass-web.workers.dev";
export function cors(req: Request): Record<string, string> {
  const supplied = req.headers.get("origin") ?? "";
  return supplied === origin ||
    supplied === "http://localhost:8081" ||
    supplied === "http://127.0.0.1:8081"
    ? {
        "Access-Control-Allow-Origin": supplied,
        "Access-Control-Allow-Headers":
          "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
}
export function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
export async function authenticated(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) throw Error("unauthorized");
  const client = admin();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw Error("unauthorized");
  return { client, user: data.user, token };
}
export async function subscriber(userId: string) {
  const key = Deno.env.get("REVENUECAT_SECRET_KEY");
  if (!key) throw Error("not_configured");
  const result = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!result.ok) throw Error("provider_unavailable");
  return result.json();
}
