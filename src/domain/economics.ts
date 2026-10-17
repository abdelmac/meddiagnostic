export type Assumptions = {
  visitors: number;
  signupRate: number;
  activationRate: number;
  conversionRate: number;
  annualShare: number;
  monthlyPrice: number;
  annualPrice: number;
  monthlyChurn: number;
  annualRenewal: number;
  refunds: number;
  taxRate: number;
  paymentFee: number;
  freeActiveUsers: number;
  costPerFreeUser: number;
  costPerPaidUser: number;
  hosting: number;
  editorial: number;
  licenses: number;
  support: number;
  maintenance: number;
  acquisition: number;
};
export function forecast(p: Assumptions, months = 24) {
  for (const key of [
    "signupRate",
    "activationRate",
    "conversionRate",
    "annualShare",
    "monthlyChurn",
    "annualRenewal",
    "paymentFee",
  ] as const) {
    if (p[key] < 0 || p[key] > 1)
      throw new Error(`${key} doit être compris entre 0 et 1`);
  }
  if (p.refunds < 0 || p.refunds >= 1 || p.taxRate < 0)
    throw new Error("Taux de remboursement ou de taxe invalide");
  for (const value of Object.values(p)) {
    if (!Number.isFinite(value) || value < 0)
      throw new Error("Hypothèse invalide");
  }
  const signed = p.visitors * p.signupRate;
  const activated = signed * p.activationRate;
  const newPaid = activated * p.conversionRate;
  let monthly = 0;
  const cohorts: { start: number; subscribers: number }[] = [];
  const fixed =
    p.hosting +
    p.editorial +
    p.licenses +
    p.support +
    p.maintenance +
    p.acquisition;
  const freeCost = p.freeActiveUsers * p.costPerFreeUser;
  return Array.from({ length: months }, (_, month) => {
    monthly =
      monthly * (1 - p.monthlyChurn) +
      newPaid * (1 - p.annualShare) * (1 - p.refunds);
    let annualBilled = newPaid * p.annualShare;
    for (const cohort of cohorts) {
      if (month > cohort.start && (month - cohort.start) % 12 === 0) {
        cohort.subscribers *= p.annualRenewal * (1 - p.refunds);
        annualBilled += cohort.subscribers / (1 - p.refunds);
      }
    }
    cohorts.push({
      start: month,
      subscribers: newPaid * p.annualShare * (1 - p.refunds),
    });
    const annual = cohorts.reduce((sum, c) => sum + c.subscribers, 0);
    const grossReceipts =
      monthly * p.monthlyPrice + annualBilled * p.annualPrice;
    const refunds = annualBilled * p.annualPrice * p.refunds;
    // Monthly expected subscribers already exclude initial refunds; no second deduction.
    const netReceipts = (grossReceipts - refunds) / (1 + p.taxRate);
    const recognized =
      (monthly * p.monthlyPrice + (annual * p.annualPrice) / 12) /
      (1 + p.taxRate);
    const feesAccrued = recognized * p.paymentFee;
    const contribution =
      recognized -
      feesAccrued -
      (monthly + annual) * p.costPerPaidUser -
      freeCost;
    const unitRevenue =
      ((1 - p.annualShare) * p.monthlyPrice +
        (p.annualShare * p.annualPrice) / 12) /
      (1 + p.taxRate);
    const unitMargin = unitRevenue * (1 - p.paymentFee) - p.costPerPaidUser;
    return {
      month: month + 1,
      signed,
      activated,
      newPaid,
      monthlySubscribers: monthly,
      annualSubscribers: annual,
      receiptsExTax: netReceipts,
      revenueExTax: recognized,
      mrrExTax: recognized,
      contribution,
      result: contribution - fixed,
      breakEvenSubscribers:
        unitMargin > 0 ? Math.ceil((fixed + freeCost) / unitMargin) : null,
    };
  });
}
