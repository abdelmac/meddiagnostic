// Native purchases require store credentials and a development build, not Expo Go.
export const billingConfigured = false;
export type { Package as BillingPackage } from "@revenuecat/purchases-js";
export async function billingClient(
  _userId: string,
): Promise<import("@revenuecat/purchases-js").Purchases> {
  throw Error("Native store configuration required");
}
