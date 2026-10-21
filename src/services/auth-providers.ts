export type GoogleStatus = "checking" | "enabled" | "disabled" | "unavailable";

/** Supabase's public settings report providers without exposing their secrets. */
export async function googleProviderStatus(
  url: string | undefined,
  publicKey: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<GoogleStatus> {
  if (!url || !publicKey) return "disabled";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(
      `${url.replace(/\/$/, "")}/auth/v1/settings`,
      {
        headers: { apikey: publicKey },
        signal: controller.signal,
      },
    );
    if (!response.ok) return "unavailable";
    const settings: unknown = await response.json();
    if (!settings || typeof settings !== "object" || !("external" in settings))
      return "unavailable";
    const external = settings.external;
    return external && typeof external === "object" && "google" in external
      ? external.google === true
        ? "enabled"
        : "disabled"
      : "disabled";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timeout);
  }
}
