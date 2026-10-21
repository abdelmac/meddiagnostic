import React, { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { useAuth } from "../auth";
import { getSupabase } from "../services/supabase";
import { quotaChanged } from "../services/quotas";
import { useI18n } from "../i18n";
import { Button, Card, Title, Txt } from "./components";
import { QuotaPanel } from "./QuotaPanel";
type Billing = {
  available: boolean;
  environment: "SANDBOX" | "PRODUCTION";
  active?: boolean;
  expiresAt?: string | null;
  canManage?: boolean;
  plans: { id: "monthly" | "yearly"; amount: number; currency: string; interval: "month" | "year" }[];
};
export function SubscriptionPanel() {
  const { user } = useAuth();
  const { language } = useI18n();
  const en = language === "en";
  const [billing, setBilling] = useState<Billing | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = async (action: string, extra: Record<string, unknown> = {}) => {
    const client = getSupabase();
    if (!client) throw Error("Unavailable");
    const { data, error } = await client.functions.invoke("stripe-billing", { body: { action, language, ...extra } });
    if (error || !data || data.error) throw Error("Unavailable");
    return data;
  };
  useEffect(() => {
    let alive = true;
    setBilling(null);
    setMessage("");
    request(user ? "status" : "plans").then((data) => { if (alive) setBilling(data); }).catch(() => {
      if (alive) setMessage(en ? "Subscriptions are temporarily unavailable. Please try again." : "Le service d’abonnement est temporairement indisponible. Réessayez.");
    });
    return () => { alive = false; };
  }, [user?.id, language]);
  const act = async (action: "checkout" | "portal" | "refresh", plan?: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await request(action, plan ? { plan } : {});
      if (action === "refresh") {
        setBilling(data);
        quotaChanged();
        setMessage(en ? "Your subscription status has been checked by the server." : "Le serveur a vérifié les droits de votre abonnement.");
      } else {
        const url = new URL(data.url);
        if (url.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)) throw Error("Invalid redirect");
        if (Platform.OS === "web") window.location.assign(url.href);
        else await Linking.openURL(url.href);
      }
    } catch {
      setMessage(en ? "This action could not be completed. Refresh your subscription status before trying again." : "Cette action n’a pas abouti. Actualisez vos droits avant de réessayer.");
    } finally { setBusy(false); }
  };
  return <Card style={{ gap: 16 }}>
    <Title style={{ fontSize: 20 }}>Ippomed Premium</Title>
    <Txt style={{ fontWeight: "700" }}>{en ? "€5 / month or €25 / year · taxes included" : "5 € / mois ou 25 € / an · TTC"}</Txt>
    <QuotaPanel />
    <Txt>{en ? "Premium: unlimited daily sessions, with all available questions. Both plans use the same catalog and corrections." : "Premium : sessions sans limite quotidienne, avec toutes les questions disponibles. Les deux offres donnent accès au même catalogue et aux corrigés."}</Txt>
    {billing?.available ? <>
      {billing.environment === "SANDBOX" && <Txt muted>{en ? "Stripe test mode. Test purchases do not remove the public free quota." : "Mode test Stripe. Les achats de test ne lèvent pas le quota gratuit public."}</Txt>}
      {!!billing.active && <Txt>{en ? "Subscription active" : "Abonnement actif"}</Txt>}
      {billing.expiresAt && <Txt>{(en ? "Current period ends: " : "Fin de la période en cours : ") + new Date(billing.expiresAt).toLocaleDateString(en ? "en-GB" : "fr-FR")}</Txt>}
      {!user && <Txt muted>{en ? "Sign in to subscribe and share Premium across your devices." : "Connectez-vous pour vous abonner et retrouver Premium sur vos appareils."}</Txt>}
      {!billing.active && billing.plans.map((plan) => {
        const price = new Intl.NumberFormat(en ? "en-GB" : "fr-FR", { style: "currency", currency: plan.currency }).format(plan.amount / 100);
        return <View key={plan.id} style={{ gap: 8 }}>
          <Txt style={{ fontWeight: "700" }}>{price} / {plan.interval === "year" ? (en ? "year" : "an") : (en ? "month" : "mois")}</Txt>
          <Button label={en ? "Continue to Stripe" : "Continuer sur Stripe"} disabled={!user || busy} onPress={() => void act("checkout", plan.id)} />
        </View>;
      })}
      <Txt muted>{en ? "Automatically renews at the displayed interval until cancelled. Review the total and terms on Stripe before confirming." : "Renouvellement automatique à la période affichée jusqu’à annulation. Vérifiez le total et les conditions sur Stripe avant de confirmer."}</Txt>
      {user && <>
        <Button secondary label={en ? "Refresh subscription status" : "Actualiser mes droits"} disabled={busy} onPress={() => void act("refresh")} />
        <Button secondary label={en ? "Manage or cancel subscription" : "Gérer ou annuler mon abonnement"} disabled={busy || !billing.canManage} onPress={() => void act("portal")} />
      </>}
    </> : <Txt muted>{en ? "Premium subscriptions will be available after Stripe and pricing are configured. No payment is currently available." : "Les abonnements Premium seront disponibles après configuration de Stripe et des tarifs. Aucun paiement n’est disponible actuellement."}</Txt>}
    {!!message && <Txt accessibilityRole="alert">{message}</Txt>}
  </Card>;
}
