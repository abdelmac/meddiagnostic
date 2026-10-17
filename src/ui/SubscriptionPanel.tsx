import React, { useEffect, useState } from "react";
import { Linking, View } from "react-native";
import { useAuth } from "../auth";
import { getSupabase } from "../services/supabase";
import {
  billingClient,
  billingConfigured,
  type BillingPackage,
} from "../services/billing";
import { useI18n } from "../i18n";
import { Button, Card, Title, Txt } from "./components";
type Entitlement = {
  available: boolean;
  active: boolean;
  store?: string | null;
  expiresAt?: string | null;
  environment: "SANDBOX";
};
export function SubscriptionPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [packages, setPackages] = useState<BillingPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manage, setManage] = useState<string | null>(null);
  const refresh = async () => {
    if (!user) return;
    const client = getSupabase();
    if (!client) return;
    const { data, error } = await client.functions.invoke("entitlement", {
      body: {},
    });
    if (error) throw error;
    setEnt(data);
    return data as Entitlement;
  };
  useEffect(() => {
    let alive = true;
    setEnt(null);
    setPackages([]);
    setManage(null);
    if (!user) return;
    refresh()
      .then(async (data) => {
        if (!alive || !billingConfigured || !data?.available) return;
        const sdk = await billingClient(user.id);
        const [offers, info] = await Promise.all([
          sdk.getOfferings({ currency: "EUR" }),
          sdk.getCustomerInfo(),
        ]);
        if (alive) {
          setPackages(
            (offers.current?.availablePackages ?? []).filter((p) =>
              ["P1M", "P1Y"].includes(p.product.normalPeriodDuration ?? ""),
            ),
          );
          setManage(info.managementURL ?? null);
        }
      })
      .catch(() => {
        if (alive)
          setMessage(
            "Le service d’abonnement est temporairement indisponible.",
          );
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);
  const purchase = async (pkg: BillingPackage) => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      const current = await refresh();
      if (!current?.available) throw Error("Unavailable");
      if (current.active) {
        setMessage("Un abonnement est déjà actif sur ce compte.");
        return;
      }
      const sdk = await billingClient(user.id);
      const info = await sdk.getCustomerInfo();
      if (Object.keys(info.entitlements.active).length) {
        setMessage(
          "Un abonnement existe déjà. Actualisez vos droits avant un nouvel achat.",
        );
        return;
      }
      await sdk.purchase({ rcPackage: pkg });
      await refresh();
      setMessage(
        "Achat de test terminé. Les droits sont vérifiés par le serveur.",
      );
    } catch {
      setMessage(
        "Achat non terminé. Aucun accès supplémentaire n’a été accordé.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: 14 }}>
      <Title style={{ fontSize: 20 }}>
        {t("Abonnement · environnement de test")}
      </Title>
      <Txt>
        {t(
          "Aucun paiement réel n’est activé. La banque de démonstration reste gratuite.",
        )}
      </Txt>
      {!user ? (
        <Txt muted>
          {t("Connectez-vous pour retrouver vos achats de test sur ce compte.")}
        </Txt>
      ) : !billingConfigured || ent?.available === false ? (
        <Txt muted>
          {t(
            "Les produits de test seront disponibles après configuration du fournisseur de paiement.",
          )}
        </Txt>
      ) : (
        <>
          <Txt>
            {t(
              ent?.active ? "Premium de test actif" : "Aucun abonnement actif",
            )}
          </Txt>
          {ent?.expiresAt && (
            <Txt>
              {t("Échéance : {0}", {
                0: new Date(ent.expiresAt).toLocaleDateString(),
              })}
            </Txt>
          )}
          {!ent?.active &&
            packages.map((pkg) => (
              <View key={pkg.identifier} style={{ gap: 8 }}>
                <Txt>{pkg.product.title}</Txt>
                <Txt>
                  {t(
                    pkg.product.normalPeriodDuration === "P1Y"
                      ? "Total annuel : {0}"
                      : "Total mensuel : {0}",
                    { 0: pkg.product.currentPrice.formattedPrice },
                  )}
                </Txt>
                <Button
                  label={`${pkg.product.currentPrice.formattedPrice} · ${t("Tester cet abonnement")}`}
                  disabled={busy || !ent?.available}
                  onPress={() => void purchase(pkg)}
                />
              </View>
            ))}
          {!!packages.length && (
            <Txt muted>
              {t(
                "Renouvellement automatique à la période indiquée jusqu’à annulation. Environnement de test uniquement.",
              )}
            </Txt>
          )}
          <Button
            secondary
            label={t("Actualiser mes droits de test")}
            disabled={busy}
            onPress={() =>
              void refresh().catch(() =>
                setMessage(
                  "Le service d’abonnement est temporairement indisponible.",
                ),
              )
            }
          />
          {manage && (
            <Button
              secondary
              label={t("Gérer mon abonnement de test")}
              onPress={() => void Linking.openURL(manage)}
            />
          )}
        </>
      )}
      {!!message && <Txt accessibilityRole="alert">{t(message)}</Txt>}
    </Card>
  );
}
