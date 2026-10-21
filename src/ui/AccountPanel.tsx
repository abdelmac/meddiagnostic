import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { LogIn, LogOut, RefreshCw, Upload } from "lucide-react-native";
import { useAuth } from "../auth";
import { useStore } from "../state";
import { useI18n } from "../i18n";
import { useTheme } from "./theme";
import { Button, Card, Chip, Title, Txt, wrap } from "./components";
export function AccountPanel() {
  const auth = useAuth();
  const { syncStatus, syncNow, importGuest } = useStore();
  const { t } = useI18n();
  const c = useTheme();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [create, setCreate] = useState(true);
  const [sent, setSent] = useState(false);
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
        <Chip
          label={t("Créer un compte")}
          selected={create}
          onPress={() => {
            setCreate(true);
            setSent(false);
            setMessage("");
            auth.clearError();
          }}
        />
        <Chip
          label={t("Se connecter")}
          selected={!create}
          onPress={() => {
            setCreate(false);
            setSent(false);
            setMessage("");
            auth.clearError();
          }}
        />
      </View>
      <Button
        secondary
        label={t("Continuer avec Google")}
        icon={LogIn}
        disabled={busy || auth.googleStatus !== "enabled"}
        onPress={() => void run(() => auth.signInWithGoogle(create), "")}
      />
      {auth.googleStatus !== "enabled" && (
        <Txt muted style={{ fontSize: 12 }}>
          {t(
            auth.googleStatus === "checking"
              ? "Vérification de la connexion Google…"
              : auth.googleStatus === "disabled"
                ? "La connexion Google sera disponible après activation. Vous pouvez utiliser l’e-mail ci-dessous."
                : "La connexion Google est temporairement indisponible. Réessayez plus tard.",
          )}
        </Txt>
      )}
      <Txt muted style={{ fontSize: 12 }}>
        {t(
          auth.googleStatus === "enabled"
            ? "La connexion par e-mail est réservée aux adresses invitées à la bêta."
            : "L’inscription est actuellement réservée aux adresses invitées à la bêta.",
        )}
      </Txt>
      <TextInput
        accessibilityLabel={t("Adresse e-mail")}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setSent(false);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="vous@exemple.fr"
        placeholderTextColor={c.muted}
        style={{
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 9,
          padding: 14,
          color: c.text,
        }}
      />
      {!sent ? (
        <Button
          label={t("Recevoir mon lien")}
          icon={LogIn}
          disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
          onPress={() =>
            void run(async () => {
              await auth.sendCode(email, create);
              setSent(true);
            }, "Si cette adresse est éligible, un lien de connexion a été envoyé. Vérifiez aussi les courriers indésirables.")
          }
        />
      ) : (
        <>
          <Txt>
            {t(
              "Ouvrez le lien sur cet appareil, dans le même navigateur. Si le message contient un code, vous pouvez aussi le saisir ci-dessous.",
            )}
          </Txt>
          <TextInput
            accessibilityLabel={t("Code de vérification")}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={12}
            style={{
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 9,
              padding: 14,
              color: c.text,
            }}
          />
          <Button
            label={t("Vérifier et continuer")}
            disabled={busy || !/^\d{6,12}$/.test(code.trim())}
            onPress={() => void run(() => auth.verifyCode(email, code), "")}
          />
          <Button
            secondary
            small
            label={t("Renvoyer le lien")}
            disabled={busy}
            onPress={() =>
              void run(
                () => auth.sendCode(email, create),
                "Si cette adresse est éligible, un lien de connexion a été envoyé. Vérifiez aussi les courriers indésirables.",
              )
            }
          />
        </>
      )}
      {!!message && <Txt accessibilityRole="alert">{t(message)}</Txt>}
      {!!auth.error && <Txt accessibilityRole="alert">{t(auth.error)}</Txt>}
      <Txt muted style={{ fontSize: 11 }}>
        {t(
          "À la création du compte, vos résultats invités seront importés après vérification. Nous conservons votre e-mail et votre progression pour les synchroniser ; ne saisissez aucune donnée de patient.",
        )}
      </Txt>
    </Card>
  );
}
