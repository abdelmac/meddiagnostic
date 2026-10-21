import React from "react";
import { View } from "react-native";
import { useAuth } from "../auth";
import { useQuota } from "../quota";
import { useI18n } from "../i18n";
import { Txt } from "./components";
export function QuotaPanel() {
  const { user } = useAuth();
  const { allowance, error } = useQuota();
  const { t } = useI18n();
  return <View style={{ gap: 7 }}>
    <Txt style={{ fontWeight: "700" }}>{t(allowance?.premium ? "Premium · sessions illimitées" : "Gratuit · 3 sessions de 10 questions par jour")}</Txt>
    {allowance && !allowance.premium && <Txt>{t("{0} session(s) restante(s) aujourd’hui", { 0: allowance.remaining })}</Txt>}
    <Txt muted>{t("Remise à zéro à minuit, heure de Paris. Reprendre une session ne consomme aucun crédit.")}</Txt>
    {!user && <Txt muted>{t("En invité, le quota est enregistré sur cet appareil. Connectez-vous pour le partager entre vos appareils.")}</Txt>}
    {!!error && <Txt accessibilityRole="alert">{t(error)}</Txt>}
  </View>;
}
