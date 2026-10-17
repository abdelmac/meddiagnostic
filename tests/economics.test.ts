import { test } from "node:test";
import assert from "node:assert/strict";
import { forecast, type Assumptions } from "../src/domain/economics";
const p: Assumptions = {
  visitors: 100,
  signupRate: 1,
  activationRate: 1,
  conversionRate: 1,
  annualShare: 1,
  monthlyPrice: 10,
  annualPrice: 120,
  monthlyChurn: 0,
  annualRenewal: 1,
  refunds: 0,
  taxRate: 0,
  paymentFee: 0,
  freeActiveUsers: 50,
  costPerFreeUser: 1,
  costPerPaidUser: 1,
  hosting: 100,
  editorial: 0,
  licenses: 0,
  support: 0,
  maintenance: 0,
  acquisition: 0,
};
test("les recettes annuelles ne sont pas intégralement du revenu mensuel", () => {
  const first = forecast(p)[0]!;
  assert.equal(first.receiptsExTax, 12000);
  assert.equal(first.revenueExTax, 1000);
  assert.equal(first.contribution, 850);
  assert.equal(first.result, 750);
  assert.equal(first.breakEvenSubscribers, 17);
});
test("renouvellement annuel à M13 et seuil absent avec marge unitaire négative", () => {
  const rows = forecast(p);
  assert.equal(rows[12]!.annualSubscribers, 1300);
  assert.equal(rows[12]!.receiptsExTax, 24000);
  assert.equal(
    forecast({ ...p, costPerPaidUser: 11 })[0]!.breakEvenSubscribers,
    null,
  );
});
