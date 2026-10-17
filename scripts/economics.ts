import { forecast, type Assumptions } from "../src/domain/economics";
const base: Assumptions = {
  visitors: 5000,
  signupRate: 0.12,
  activationRate: 0.6,
  conversionRate: 0.06,
  annualShare: 0.65,
  monthlyPrice: 9.99,
  annualPrice: 69.99,
  monthlyChurn: 0.08,
  annualRenewal: 0.55,
  refunds: 0.03,
  taxRate: 0.2,
  paymentFee: 0.2,
  freeActiveUsers: 1200,
  costPerFreeUser: 0.08,
  costPerPaidUser: 0.25,
  hosting: 80,
  editorial: 800,
  licenses: 150,
  support: 150,
  maintenance: 500,
  acquisition: 200,
};
const scenarios = {
  prudent: {
    ...base,
    visitors: 2000,
    conversionRate: 0.03,
    monthlyChurn: 0.12,
    annualRenewal: 0.4,
  },
  intermédiaire: base,
  favorable: {
    ...base,
    visitors: 12000,
    conversionRate: 0.1,
    monthlyChurn: 0.05,
    annualRenewal: 0.7,
    freeActiveUsers: 3000,
    editorial: 1600,
    support: 300,
    acquisition: 600,
  },
};
console.log(
  "SIMULATION — hypothèses non validées, montants en euros hors taxe. Aucune garantie de revenu.",
);
for (const [scenario, p] of Object.entries(scenarios)) {
  const rows = forecast(p);
  console.table(
    rows
      .filter((r) => [1, 12, 24].includes(r.month))
      .map((r) => ({
        scénario: scenario,
        mois: r.month,
        inscrits: r.signed,
        activés: r.activated,
        abonnés: Math.round(r.monthlySubscribers + r.annualSubscribers),
        encaissements: Math.round(r.receiptsExTax),
        CA: Math.round(r.revenueExTax),
        MRR: Math.round(r.mrrExTax),
        marge: Math.round(r.contribution),
        résultat: Math.round(r.result),
        seuil: r.breakEvenSubscribers,
      })),
  );
}
