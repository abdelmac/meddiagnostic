import assert from "node:assert/strict";
import { test } from "node:test";
import {
  stripeEntitlement,
  stripePlan,
} from "../src/domain/stripe-entitlements";

test("Stripe : aucune élévation Premium par prix étranger, facture impayée, environnement de test ou période expirée", () => {
  const now = Date.parse("2026-10-21T12:00:00Z");
  const subscription = {
    status: "active",
    livemode: true,
    latest_invoice: { status: "paid" },
    items: {
      data: [
        {
          price: { id: "price_premium" },
          current_period_end: now / 1000 + 3600,
        },
      ],
    },
  };
  assert.deepEqual(
    stripeEntitlement([subscription], ["price_premium"], true, now),
    { active: true, expiresAt: "2026-10-21T13:00:00.000Z" },
  );
  for (const changed of [
    { ...subscription, livemode: false },
    { ...subscription, status: "past_due" },
    { ...subscription, status: "trialing" },
    { ...subscription, pause_collection: {} },
    { ...subscription, latest_invoice: { status: "open" } },
    { ...subscription, latest_invoice: "in_not_expanded" },
    {
      ...subscription,
      items: {
        data: [
          {
            price: { id: "price_other_product" },
            current_period_end: now / 1000 + 3600,
          },
        ],
      },
    },
    {
      ...subscription,
      items: {
        data: [
          { price: { id: "price_premium" }, current_period_end: now / 1000 },
        ],
      },
    },
  ])
    assert.deepEqual(
      stripeEntitlement([changed], ["price_premium"], true, now),
      { active: false, expiresAt: null },
    );
});

test("Stripe : les offres affichées correspondent à un prix EUR récurrent TTC autorisé", () => {
  const price = {
    active: true,
    livemode: false,
    currency: "eur",
    unit_amount: 500,
    billing_scheme: "per_unit",
    tax_behavior: "inclusive",
    recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
  };
  assert.deepEqual(stripePlan(price, "monthly", false), {
    id: "monthly",
    amount: 500,
    currency: "eur",
    interval: "month",
  });
  for (const changed of [
    { ...price, livemode: true },
    { ...price, currency: "usd" },
    { ...price, unit_amount: 0 },
    { ...price, tax_behavior: "exclusive" },
    { ...price, recurring: { ...price.recurring, interval_count: 3 } },
  ])
    assert.throws(() => stripePlan(changed, "monthly", false));
});
