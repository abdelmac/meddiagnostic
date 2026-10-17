import React, { useState } from "react";
import { View, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../auth";
import { getSupabase } from "../services/supabase";
import { useI18n } from "../i18n";
import { useTheme } from "./theme";
import { Button, Card, Title, Txt } from "./components";
export function DeleteAccountPanel() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const c = useTheme();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!user) return null;
  return (
    <Card style={{ gap: 14 }}>
      <Title style={{ fontSize: 20 }}>{t("Supprimer mon compte")}</Title>
      <Txt>
        {t(
          "Exportez vos données avant de continuer. La suppression efface définitivement le compte et sa progression distante. Annulez tout abonnement depuis sa plateforme de gestion.",
        )}
      </Txt>
      <Txt muted>
        {t(
          "Une connexion datant de moins de 10 minutes est requise. Pour confirmer, saisissez DELETE.",
        )}
      </Txt>
      <TextInput
        accessibilityLabel={t("Confirmation de suppression du compte")}
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        style={{
          padding: 14,
          borderWidth: 1,
          borderRadius: 9,
          borderColor: c.line,
          color: c.text,
        }}
      />
      <Button
        label={t("Supprimer définitivement mon compte")}
        disabled={busy || confirm !== "DELETE"}
        onPress={() =>
          void (async () => {
            setBusy(true);
            try {
              const { data, error } = await getSupabase()!.functions.invoke(
                "delete-account",
                { body: { confirm: "DELETE" } },
              );
              if (error || !data?.deleted) throw Error("Failed");
              await AsyncStorage.removeItem(`medquiz.account.${user.id}.v1`);
              await signOut();
            } catch {
              setMessage(
                "Suppression impossible. Reconnectez-vous et vérifiez la gestion de votre abonnement avant de réessayer.",
              );
            } finally {
              setBusy(false);
            }
          })()
        }
      />
      {!!message && <Txt accessibilityRole="alert">{t(message)}</Txt>}
    </Card>
  );
}
