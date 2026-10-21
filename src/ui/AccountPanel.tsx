import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { LogIn, LogOut, RefreshCw, Upload } from "lucide-react-native";
import { useAuth } from "../auth";
import { useStore } from "../state";
import { useI18n } from "../i18n";
import { useTheme } from "./theme";
import { Button, Card, Title, Txt, wrap } from "./components";
export function AccountPanel() {
  const auth = useAuth();
  const router = useRouter();
  const { syncStatus, syncNow, importGuest } = useStore();
  const { t } = useI18n();
  const c = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage("");
    auth.clearError();
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("Action impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  };
  if (!auth.configured)
    return (
      <Card style={{ gap: 12 }}>
        <Title style={{ fontSize: 20 }}>{t("Votre compte")}</Title>
        <Txt>
          {t(
            "La connexion aux comptes est en cours de préparation. Votre progression invitée reste sauvegardée sur cet appareil.",
          )}
        </Txt>
      </Card>
    );
  if (auth.user)
    return (
      <Card style={{ gap: 14 }}>
        <Title style={{ fontSize: 21 }}>{t("Votre compte")}</Title>
        <Txt>{auth.user.email}</Txt>
        <Txt style={{ color: syncStatus === "offline" ? c.error : c.accent }}>
          {t(
            syncStatus === "syncing"
              ? "Synchronisation en cours…"
              : syncStatus === "synced"
                ? "Progression synchronisée"
                : syncStatus === "offline"
                  ? "Hors connexion : vos modifications restent sur cet appareil."
                  : "Progression sauvegardée sur cet appareil",
          )}
        </Txt>
        <View style={wrap}>
          <Button
            secondary
            small
            label={t("Synchroniser maintenant")}
            icon={RefreshCw}
            disabled={busy || syncStatus === "syncing"}
            onPress={() => void run(syncNow, "")}
          />
          <Button
            secondary
            small
            label={t("Importer ma progression invitée")}
            icon={Upload}
            disabled={busy}
            onPress={() =>
              void run(
                importGuest,
                "Progression invitée importée. La synchronisation réessaiera si le réseau est indisponible.",
              )
            }
          />
        </View>
        <Txt muted style={{ fontSize: 12 }}>
          {t(
            "L’import ajoute les résultats invités sans doublon. Vos données de compte sont séparées de celles des autres comptes sur cet appareil.",
          )}
        </Txt>
        {!!message && <Txt accessibilityRole="alert">{t(message)}</Txt>}
        <Button
          secondary
          small
          label={t("Se déconnecter")}
          icon={LogOut}
          disabled={busy}
          onPress={() => void run(auth.signOut, "")}
        />
      </Card>
    );
  return (
    <Card style={{ gap: 16 }}>
      <Title style={{ fontSize: 22 }}>
        {t("Sauvegardez vos progrès, retrouvez-les partout.")}
      </Title>
      <Txt muted>
        {t(
          "Avec Google ou un lien par e-mail. Aucune carte bancaire nécessaire.",
        )}
      </Txt>
      <View style={wrap}>
        <Button
          label={t("Se connecter")}
          icon={LogIn}
          onPress={() => router.push("/auth?mode=login")}
        />
        <Button
          secondary
          label={t("Créer un compte")}
          onPress={() => router.push("/auth?mode=signup")}
        />
      </View>
    </Card>
  );
}
