export type CanonicalSubscriber = {
  subscriber?: {
    entitlements?: Record<
      string,
      { expires_date?: string | null; product_identifier?: string }
    >;
    subscriptions?: Record<
      string,
      { is_sandbox?: boolean; store?: string; expires_date?: string | null }
    >;
  };
};
export function sandboxEntitlement(
  data: CanonicalSubscriber,
  now = Date.now(),
) {
  const ent = data.subscriber?.entitlements?.premium;
  const sub = ent?.product_identifier
    ? data.subscriber?.subscriptions?.[ent.product_identifier]
    : undefined;
  const expiry = ent?.expires_date ? Date.parse(ent.expires_date) : NaN;
  return {
    active: sub?.is_sandbox === true && Number.isFinite(expiry) && expiry > now,
    expiresAt: Number.isFinite(expiry) ? new Date(expiry).toISOString() : null,
    store: sub?.store ?? null,
  };
}
