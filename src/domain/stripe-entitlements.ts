type StripeSubscription = {
  status: string;
  livemode: boolean;
  items: { data: { price: { id: string }; current_period_end: number }[] };
  latest_invoice?: { status?: string | null } | string | null;
  pause_collection?: unknown;
};

/** Only canonical provider objects and server-whitelisted prices can grant access. */
export function stripeEntitlement(
  subscriptions: StripeSubscription[],
  priceIds: string[],
  live: boolean,
  now = Date.now(),
) {
  const paidEnds = subscriptions.flatMap((subscription) => {
    if (
      subscription.livemode !== live ||
      subscription.status !== "active" ||
      subscription.pause_collection ||
      !subscription.latest_invoice ||
      typeof subscription.latest_invoice !== "object" ||
      subscription.latest_invoice.status !== "paid"
    )
      return [];
    return subscription.items.data
      .filter(
        (item) =>
          priceIds.includes(item.price.id) &&
          Number.isFinite(item.current_period_end) &&
          item.current_period_end * 1000 > now,
      )
      .map((item) => item.current_period_end * 1000);
  });
  const expiresAt = paidEnds.length
    ? new Date(Math.max(...paidEnds)).toISOString()
    : null;
  return { active: expiresAt !== null, expiresAt };
}

export function stripePlan(
  price: {
    active: boolean;
    livemode: boolean;
    currency: string;
    unit_amount: number | null;
    recurring?: {
      interval: string;
      interval_count: number;
      usage_type: string;
    } | null;
    billing_scheme: string;
    tax_behavior?: string | null;
  },
  id: "monthly" | "yearly",
  live: boolean,
) {
  const interval = id === "monthly" ? "month" : "year";
  if (
    !price.active ||
    price.livemode !== live ||
    price.currency !== "eur" ||
    price.billing_scheme !== "per_unit" ||
    !Number.isSafeInteger(price.unit_amount) ||
    price.unit_amount !== (id === "monthly" ? 500 : 2500) ||
    price.recurring?.interval !== interval ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed" ||
    price.tax_behavior !== "inclusive"
  )
    throw Error("invalid_price_configuration");
  return {
    id,
    amount: price.unit_amount!,
    currency: "eur" as const,
    interval: interval as "month" | "year",
  };
}
