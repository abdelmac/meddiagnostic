import type { Package, Purchases } from "@revenuecat/purchases-js";
const key = process.env.EXPO_PUBLIC_REVENUECAT_WEB_SANDBOX_KEY;
let instance: Purchases | null = null;
let owner = "";
export const billingConfigured = !!key?.startsWith("rcb_sb_");
export async function billingClient(userId: string) {
  if (!billingConfigured) throw Error("Billing not configured");
  const { Purchases } = await import("@revenuecat/purchases-js");
  if (!instance) {
    instance = Purchases.configure({ apiKey: key!, appUserId: userId });
    owner = userId;
  } else if (owner !== userId) {
    await instance.changeUser(userId);
    owner = userId;
  }
  if (!instance.isSandbox()) throw Error("Only sandbox is allowed");
  return instance;
}
export type BillingPackage = Package;
