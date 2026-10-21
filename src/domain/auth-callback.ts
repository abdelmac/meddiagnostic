/** Only the app's own native callback may exchange a PKCE code. */
export function nativeAuthCallback(
  raw: string,
):
  | { code: string; error?: never }
  | { error: "cancelled" | "failed"; code?: never }
  | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (
    url.protocol !== "medquiz:" ||
    url.username ||
    url.password ||
    !(
      (url.hostname === "auth" && url.pathname === "/callback") ||
      (!url.hostname && (!url.pathname || url.pathname === "/"))
    )
  )
    return null;
  const error = callbackError(url);
  if (error) return { error };
  const code = url.searchParams.get("code");
  return code && code.length <= 2048 ? { code } : null;
}

/** Never display provider error descriptions, which are untrusted URL content. */
export function callbackError(url: URL): "cancelled" | "failed" | null {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const error = url.searchParams.get("error") ?? hash.get("error");
  if (error === "access_denied") return "cancelled";
  return error ||
    url.searchParams.has("error_description") ||
    url.searchParams.has("error_code") ||
    hash.has("error_description") ||
    hash.has("error_code")
    ? "failed"
    : null;
}

export function cleanAuthCallbackURL(raw: string) {
  const url = new URL(raw);
  const fields = [
    "code",
    "error",
    "error_code",
    "error_description",
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "provider_token",
    "provider_refresh_token",
    "type",
  ];
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const hasAuthQuery = [
    "code",
    "error",
    "error_description",
    "access_token",
  ].some((field) => url.searchParams.has(field));
  const hasAuthHash = ["error", "error_description", "access_token"].some(
    (field) => hash.has(field),
  );
  if (hasAuthQuery) fields.forEach((field) => url.searchParams.delete(field));
  if (hasAuthHash) {
    fields.forEach((field) => hash.delete(field));
    url.hash = hash.toString();
  }
  return url.toString();
}
