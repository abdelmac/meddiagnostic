import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  Flame,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import {
  authFeedback,
  normalizeEmail,
  validAuthCode,
  validAuthEmail,
} from "../domain/auth-feedback";
import {
  AUTH_DESTINATION_KEY,
  AUTH_MODE_KEY,
  AUTH_PENDING_REQUEST_KEY as PENDING_KEY,
  type AuthDestination,
} from "../domain/auth-navigation";
import { Brand } from "./Brand";
import { Txt } from "./components";
import { useTheme } from "./theme";

type Mode = "login" | "signup";
type Pending = { email: string; mode: Mode; sentAt: number };
const RESEND_SECONDS = 60;

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.89-1.74 2.98-4.3 2.98-7.37Z"
      />
      <Path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.04.97-3.38.97-2.61 0-4.83-1.76-5.62-4.13H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <Path
        fill="#FBBC05"
        d="M6.38 13.92A6 6 0 0 1 6.07 12c0-.67.11-1.32.31-1.92v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.52l3.34-2.6Z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.48l3.34 2.6C7.17 7.71 9.39 5.95 12 5.95Z"
      />
    </Svg>
  );
}

export function AuthenticationScreen({
  initialMode,
  destination,
}: {
  initialMode: Mode;
  destination: AuthDestination;
}) {
  const auth = useAuth();
  const router = useRouter();
  const c = useTheme();
  const { language, setLanguage } = useI18n();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const l = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState<"send" | "verify" | "google" | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const codeRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [now, setNow] = useState(Date.now());
  const [issue, setIssue] = useState<{
    value: unknown;
    stage: "send" | "verify" | "google";
  } | null>(null);
  const [focused, setFocused] = useState<"email" | "code" | null>(null);
  const [resent, setResent] = useState(false);
  const feedback = issue
    ? authFeedback(issue.value, issue.stage, language)
    : null;
  const remaining = pending
    ? Math.max(
        0,
        Math.ceil((pending.sentAt + RESEND_SECONDS * 1000 - now) / 1000),
      )
    : 0;

  useEffect(() => {
    mounted.current = true;
    void AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (!raw || !mounted.current) return;
        try {
          const saved: Pending = JSON.parse(raw);
          const age = Date.now() - saved.sentAt;
          if (
            validAuthEmail(saved.email) &&
            saved.mode === initialMode &&
            Number.isFinite(age) &&
            age >= 0 &&
            age < 60 * 60 * 1000
          ) {
            setEmail(saved.email);
            setPending(saved);
          } else void AsyncStorage.removeItem(PENDING_KEY);
        } catch {
          void AsyncStorage.removeItem(PENDING_KEY);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setHydrated(true);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(
      () => (pending ? codeRef.current?.focus() : emailRef.current?.focus()),
      150,
    );
    return () => clearTimeout(timer);
  }, [pending?.email, hydrated]);

  const leave = () => {
    if (busyRef.current) return;
    auth.clearError();
    router.replace("/");
  };
  const changeMode = (next: Mode) => {
    if (busyRef.current || next === mode) return;
    setMode(next);
    setPending(null);
    setCode("");
    setIssue(null);
    setResent(false);
    auth.clearError();
    void AsyncStorage.removeItem(PENDING_KEY);
    router.setParams({ mode: next });
  };
  const run = async (
    stage: "send" | "verify" | "google",
    action: () => Promise<void>,
  ) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(stage);
    setIssue(null);
    auth.clearError();
    try {
      await action();
    } catch (value) {
      if (mounted.current) setIssue({ value, stage });
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(null);
    }
  };
  const send = () => {
    const address = normalizeEmail(pending?.email ?? email);
    if (!validAuthEmail(address)) {
      setIssue({ value: { code: "invalid_email" }, stage: "send" });
      emailRef.current?.focus();
      return;
    }
    if (pending && remaining > 0) return;
    void run("send", async () => {
      await AsyncStorage.multiSet([
        [AUTH_DESTINATION_KEY, destination],
        [AUTH_MODE_KEY, mode],
      ]);
      await auth.sendCode(address, mode === "signup");
      const next = { email: address, mode, sentAt: Date.now() };
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      if (mounted.current) {
        setEmail(address);
        setCode("");
        setPending(next);
        setNow(Date.now());
        setResent(!!pending);
      }
    });
  };
  const verify = () => {
    if (!pending) return;
    if (!validAuthCode(code)) {
      setIssue({ value: { code: "invalid_code" }, stage: "verify" });
      codeRef.current?.focus();
      return;
    }
    void run("verify", async () => {
      await auth.verifyCode(pending.email, code);
      await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    });
  };
  const editEmail = () => {
    if (busyRef.current) return;
    setPending(null);
    setCode("");
    setIssue(null);
    setResent(false);
    void AsyncStorage.removeItem(PENDING_KEY);
  };

  const actionButton = (
    label: string,
    onPress: () => void,
    options: {
      secondary?: boolean;
      disabled?: boolean;
      loading?: boolean;
      google?: boolean;
    } = {},
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: !!options.disabled,
        busy: !!options.loading,
      }}
      disabled={options.disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => ({
        minHeight: 54,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: options.secondary ? c.line : c.accent,
        backgroundColor: options.secondary ? c.card : c.accent,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        opacity: options.disabled ? 0.55 : pressed ? 0.85 : 1,
        ...(hovered && !options.disabled ? { borderColor: c.accent } : {}),
      })}
    >
      {options.loading ? (
        <ActivityIndicator
          size="small"
          color={options.secondary ? c.accent : "#fff"}
        />
      ) : options.google ? (
        <GoogleMark />
      ) : null}
      <Txt
        style={{
          fontWeight: "700",
          fontSize: 14,
          color: options.secondary ? c.text : "#fff",
        }}
      >
        {label}
      </Txt>
      {!options.loading && !options.google && (
        <ArrowRight size={17} color={options.secondary ? c.accent : "#fff"} />
      )}
    </Pressable>
  );
  const inputStyle = (field: "email" | "code") => ({
    minHeight: 56,
    borderWidth: 1.5,
    borderColor:
      feedback?.field === field
        ? c.error
        : focused === field
          ? c.accent
          : c.line,
    borderRadius: 12,
    backgroundColor: c.card,
    color: c.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: field === "code" ? 23 : 16,
    letterSpacing: field === "code" ? 4 : 0,
    outlineWidth: 0,
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{
            flexDirection: wide ? "row" : "column",
            flexGrow: 1,
            minHeight: wide ? 780 : undefined,
          }}
        >
          {wide && (
            <View
              style={{
                width: "44%",
                backgroundColor: "#291343",
                padding: 48,
                overflow: "hidden",
                justifyContent: "space-between",
                gap: 45,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  width: 460,
                  height: 460,
                  borderRadius: 230,
                  backgroundColor: "#552a8b",
                  opacity: 0.2,
                  top: 50,
                  left: -150,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 400,
                  height: 400,
                  borderRadius: 200,
                  borderWidth: 1,
                  borderColor: "#6c4990",
                  opacity: 0.25,
                  right: -230,
                  bottom: 80,
                }}
              />
              <View style={{ gap: 9 }}>
                <Txt
                  style={{
                    color: "#c6aaff",
                    letterSpacing: 3,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {l("VOTRE ESPACE POUR PROGRESSER", "YOUR SPACE TO GROW")}
                </Txt>
                <Txt style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>
                  ippomed
                </Txt>
              </View>
              <View style={{ gap: 28, maxWidth: 450 }}>
                <View
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 20,
                    backgroundColor: "#40215e",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Sparkles size={29} color="#b2ea19" />
                </View>
                <Txt
                  accessibilityRole="header"
                  style={{
                    fontSize: width > 1400 ? 54 : 44,
                    lineHeight: 62,
                    letterSpacing: -1.6,
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  {l("Un peu chaque jour.", "A little every day.")}
                  <Txt
                    style={{
                      fontSize: width > 1400 ? 54 : 44,
                      lineHeight: 62,
                      letterSpacing: -1.6,
                      fontWeight: "700",
                      color: "#b2ea19",
                    }}
                  >
                    {"\n"}
                    {l("Beaucoup à retenir.", "So much to remember.")}
                  </Txt>
                </Txt>
                <Txt style={{ color: "#d4c4e8", fontSize: 16, lineHeight: 27 }}>
                  {l(
                    "Comprenez le corps. Affinez votre raisonnement. Construisez une révision qui vous ressemble.",
                    "Understand the body. Sharpen your reasoning. Build a study routine that feels like you.",
                  )}
                </Txt>
                <View style={{ gap: 22, marginTop: 6 }}>
                  {[
                    {
                      icon: BookOpen,
                      title: l(
                        "De l’anatomie aux cas cliniques",
                        "From anatomy to clinical cases",
                      ),
                      body: l(
                        "Des quiz et des explications, à votre niveau.",
                        "Quizzes and explanations at your level.",
                      ),
                    },
                    {
                      icon: Flame,
                      title: l("Chaque jour compte", "Every day counts"),
                      body: l(
                        "Vos séries rendent vos efforts visibles.",
                        "Your streaks make your effort visible.",
                      ),
                    },
                    {
                      icon: ShieldCheck,
                      title: l(
                        "Votre progression vous suit",
                        "Your progress follows you",
                      ),
                      body: l(
                        "Retrouvez vos révisions sur vos appareils.",
                        "Keep your study history across devices.",
                      ),
                    },
                  ].map(({ icon: Icon, title, body }) => (
                    <View
                      key={title}
                      style={{
                        flexDirection: "row",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      <Icon size={22} color="#c6aaff" />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Txt
                          style={{
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: 14,
                          }}
                        >
                          {title}
                        </Txt>
                        <Txt style={{ color: "#c4b4d9", fontSize: 12 }}>
                          {body}
                        </Txt>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View
                style={{
                  gap: 12,
                  paddingTop: 24,
                  borderTopWidth: 1,
                  borderColor: "#4a2f62",
                }}
              >
                <Txt style={{ color: "#d2c3e2", fontSize: 12 }}>
                  {l(
                    "Commencez gratuitement. Aucune carte bancaire.",
                    "Start for free. No payment card needed.",
                  )}
                </Txt>
                <Txt style={{ color: "#a692bd", fontSize: 11 }}>
                  {l(
                    "Un outil de formation, à votre rythme.",
                    "A learning tool, at your own pace.",
                  )}
                </Txt>
              </View>
            </View>
          )}
          <View
            style={{
              flex: 1,
              paddingHorizontal: wide ? 46 : 22,
              paddingTop: wide ? 32 : 22,
              paddingBottom: 28,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={l("Retour à l’accueil", "Back to home")}
                onPress={leave}
                disabled={!!busy}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Brand compact={!wide} />
              </Pressable>
              <View
                style={{
                  flexDirection: "row",
                  borderWidth: 1,
                  borderColor: c.line,
                  borderRadius: 10,
                  padding: 3,
                }}
              >
                {(["fr", "en"] as const).map((locale) => (
                  <Pressable
                    key={locale}
                    accessibilityRole="button"
                    accessibilityLabel={
                      locale === "fr" ? "Français" : "English"
                    }
                    aria-pressed={language === locale}
                    onPress={() => setLanguage(locale)}
                    style={{
                      minWidth: 40,
                      minHeight: 38,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        language === locale ? c.soft : "transparent",
                      borderRadius: 7,
                    }}
                  >
                    <Txt
                      style={{
                        fontSize: 12,
                        fontWeight: language === locale ? "700" : "400",
                        color: language === locale ? c.accent : c.muted,
                      }}
                    >
                      {locale.toUpperCase()}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            </View>
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                paddingTop: wide ? 45 : 38,
                paddingBottom: 36,
                width: "100%",
                maxWidth: 440,
                alignSelf: "center",
              }}
            >
              {!hydrated ? (
                <ActivityIndicator
                  color={c.accent}
                  accessibilityLabel={l(
                    "Chargement de la connexion",
                    "Loading sign-in",
                  )}
                />
              ) : (
                <View style={{ gap: 24 }}>
                  <View style={{ gap: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: c.accent,
                        }}
                      />
                      <Txt
                        style={{
                          color: c.accent,
                          fontSize: 11,
                          letterSpacing: 1.4,
                          fontWeight: "700",
                        }}
                      >
                        {pending
                          ? l("UN DERNIER PAS", "ONE LAST STEP")
                          : l("BIENVENUE CHEZ IPPOMED", "WELCOME TO IPPOMED")}
                      </Txt>
                    </View>
                    <Txt
                      accessibilityRole="header"
                      style={{
                        fontSize: wide ? 34 : 30,
                        lineHeight: 44,
                        letterSpacing: -1,
                        fontWeight: "700",
                      }}
                    >
                      {pending
                        ? l("Consultez votre boîte mail", "Check your inbox")
                        : mode === "signup"
                          ? l("Créez votre compte.", "Create your account.")
                          : l("Heureux de vous retrouver.", "Welcome back.")}
                    </Txt>
                    <Txt muted style={{ fontSize: 14 }}>
                      {pending
                        ? l(
                            "Si votre adresse est éligible, vous recevrez un lien pour continuer.",
                            "If your address is eligible, you will receive a link to continue.",
                          )
                        : mode === "signup"
                          ? l(
                              "Un compte gratuit pour garder vos progrès et faire de chaque révision une habitude.",
                              "A free account to keep your progress and make studying a habit.",
                            )
                          : l(
                              "Retrouvez vos révisions, vos favoris et votre série quotidienne.",
                              "Pick up your study sessions, favourites and daily streak.",
                            )}
                    </Txt>
                  </View>
                  {!auth.configured && (
                    <View
                      accessibilityRole="alert"
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: c.errorBg,
                      }}
                    >
                      <Txt style={{ color: c.error }}>
                        {l(
                          "La connexion est indisponible pour le moment. Vous pouvez continuer à réviser sans compte.",
                          "Sign-in is currently unavailable. You can keep studying without an account.",
                        )}
                      </Txt>
                    </View>
                  )}
                  {!pending ? (
                    <>
                      <View
                        style={{
                          flexDirection: "row",
                          backgroundColor: c.soft,
                          borderRadius: 12,
                          padding: 4,
                          gap: 4,
                        }}
                      >
                        {(["login", "signup"] as const).map((value) => (
                          <Pressable
                            key={value}
                            accessibilityRole="button"
                            aria-pressed={mode === value}
                            disabled={!!busy}
                            onPress={() => changeMode(value)}
                            style={{
                              flex: 1,
                              minHeight: 44,
                              borderRadius: 9,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor:
                                mode === value ? c.card : "transparent",
                              paddingHorizontal: 5,
                            }}
                          >
                            <Txt
                              style={{
                                fontWeight: "600",
                                fontSize: 13,
                                color: mode === value ? c.accent : c.muted,
                              }}
                            >
                              {value === "signup"
                                ? l("Créer un compte", "Create an account")
                                : l("Se connecter", "Sign in")}
                            </Txt>
                          </Pressable>
                        ))}
                      </View>
                      <View style={{ gap: 9 }}>
                        {actionButton(
                          l("Continuer avec Google", "Continue with Google"),
                          () => {
                            void run("google", async () => {
                              await AsyncStorage.multiSet([
                                [AUTH_DESTINATION_KEY, destination],
                                [AUTH_MODE_KEY, mode],
                              ]);
                              await auth.signInWithGoogle(mode === "signup");
                            });
                          },
                          {
                            secondary: true,
                            google: true,
                            loading: busy === "google",
                            disabled:
                              !!busy ||
                              auth.googleStatus !== "enabled" ||
                              !auth.configured,
                          },
                        )}
                        {auth.googleStatus !== "enabled" && (
                          <Txt
                            muted
                            style={{ fontSize: 11, textAlign: "center" }}
                          >
                            {auth.googleStatus === "checking"
                              ? l("Vérification de Google…", "Checking Google…")
                              : auth.googleStatus === "disabled"
                                ? l(
                                    "Google sera bientôt disponible. Utilisez l’e-mail en attendant.",
                                    "Google will be available soon. Use email in the meantime.",
                                  )
                                : l(
                                    "Google est temporairement indisponible. Réessayez plus tard.",
                                    "Google is temporarily unavailable. Please try again later.",
                                  )}
                          </Txt>
                        )}
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <View
                          style={{
                            height: 1,
                            backgroundColor: c.line,
                            flex: 1,
                          }}
                        />
                        <Txt muted style={{ fontSize: 11 }}>
                          {l("ou avec votre e-mail", "or with your email")}
                        </Txt>
                        <View
                          style={{
                            height: 1,
                            backgroundColor: c.line,
                            flex: 1,
                          }}
                        />
                      </View>
                      <View style={{ gap: 9 }}>
                        <Txt style={{ fontSize: 13, fontWeight: "600" }}>
                          {l("Adresse e-mail", "Email address")}
                        </Txt>
                        <TextInput
                          ref={emailRef}
                          accessibilityLabel={l(
                            "Adresse e-mail",
                            "Email address",
                          )}
                          aria-invalid={feedback?.field === "email"}
                          aria-describedby={
                            feedback?.field === "email"
                              ? "auth-feedback"
                              : undefined
                          }
                          value={email}
                          onChangeText={(value) => {
                            setEmail(value);
                            setIssue(null);
                          }}
                          editable={!busy && auth.configured}
                          keyboardType="email-address"
                          autoComplete="email"
                          textContentType="emailAddress"
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder={l("vous@exemple.fr", "you@example.com")}
                          placeholderTextColor={c.muted}
                          maxLength={254}
                          onFocus={() => setFocused("email")}
                          onBlur={() => setFocused(null)}
                          onSubmitEditing={send}
                          returnKeyType="send"
                          style={inputStyle("email")}
                        />
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <LockKeyhole size={12} color={c.muted} />
                          <Txt muted style={{ fontSize: 11 }}>
                            {l(
                              "Un lien sécurisé. Aucun mot de passe à retenir.",
                              "A secure link. No password to remember.",
                            )}
                          </Txt>
                        </View>
                      </View>
                      {actionButton(
                        busy === "send"
                          ? l("Envoi en cours…", "Sending…")
                          : l("Recevoir mon lien", "Send my sign-in link"),
                        send,
                        {
                          loading: busy === "send",
                          disabled: !!busy || !auth.configured,
                        },
                      )}
                      <View
                        style={{
                          backgroundColor: c.soft,
                          padding: 13,
                          borderRadius: 11,
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: 9,
                        }}
                      >
                        <CircleAlert size={16} color={c.accent} />
                        <Txt style={{ flex: 1, fontSize: 11, color: c.muted }}>
                          {l(
                            "Accès bêta : l’inscription par e-mail est actuellement réservée aux adresses invitées.",
                            "Beta access: email registration is currently limited to invited addresses.",
                          )}
                        </Txt>
                      </View>
                    </>
                  ) : (
                    <>
                      <View
                        style={{
                          backgroundColor: c.soft,
                          borderRadius: 15,
                          padding: 18,
                          gap: 13,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <Mail size={23} color={c.accent} />
                          <View style={{ flex: 1, gap: 2 }}>
                            <Txt muted style={{ fontSize: 11 }}>
                              {l("Votre adresse", "Your address")}
                            </Txt>
                            <Txt style={{ fontWeight: "600", fontSize: 14 }}>
                              {pending.email}
                            </Txt>
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          disabled={!!busy}
                          onPress={editEmail}
                          style={{ minHeight: 32, justifyContent: "center" }}
                        >
                          <Txt
                            style={{
                              fontSize: 12,
                              color: c.accent,
                              fontWeight: "600",
                            }}
                          >
                            {l(
                              "Modifier l’adresse e-mail",
                              "Change email address",
                            )}
                          </Txt>
                        </Pressable>
                      </View>
                      <Txt muted style={{ fontSize: 13 }}>
                        {l(
                          "Ouvrez le lien dans ce navigateur, sur cet appareil. Vérifiez aussi vos courriers indésirables. Si le message contient un code, saisissez-le ci-dessous.",
                          "Open the link in this browser, on this device. Check your spam folder too. If the message includes a code, enter it below.",
                        )}
                      </Txt>
                      <View style={{ gap: 10 }}>
                        <Txt style={{ fontSize: 13, fontWeight: "600" }}>
                          {l("Code de vérification", "Verification code")}
                        </Txt>
                        <TextInput
                          ref={codeRef}
                          accessibilityLabel={l(
                            "Code de vérification",
                            "Verification code",
                          )}
                          aria-invalid={feedback?.field === "code"}
                          aria-describedby={
                            feedback?.field === "code"
                              ? "auth-feedback"
                              : undefined
                          }
                          value={code}
                          onChangeText={(value) => {
                            setCode(value.replace(/\s/g, ""));
                            setIssue(null);
                          }}
                          editable={!busy}
                          autoComplete="one-time-code"
                          textContentType="oneTimeCode"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="number-pad"
                          maxLength={12}
                          placeholder="000000"
                          placeholderTextColor={c.muted}
                          onFocus={() => setFocused("code")}
                          onBlur={() => setFocused(null)}
                          onSubmitEditing={verify}
                          returnKeyType="done"
                          style={inputStyle("code")}
                        />
                      </View>
                      {actionButton(
                        busy === "verify"
                          ? l("Vérification…", "Verifying…")
                          : l("Vérifier et continuer", "Verify and continue"),
                        verify,
                        { loading: busy === "verify", disabled: !!busy },
                      )}
                      <View style={{ gap: 8 }}>
                        {actionButton(
                          l("Renvoyer le lien", "Resend sign-in link"),
                          send,
                          {
                            secondary: true,
                            loading: busy === "send",
                            disabled: !!busy || remaining > 0,
                          },
                        )}
                        <Txt
                          muted
                          style={{ fontSize: 11, textAlign: "center" }}
                        >
                          {remaining > 0
                            ? l(
                                `Nouvel envoi possible dans ${remaining} s.`,
                                `You can resend in ${remaining}s.`,
                              )
                            : l(
                                "Toujours rien ? Demandez un nouveau lien.",
                                "Still nothing? Request a new link.",
                              )}
                        </Txt>
                      </View>
                      {resent && (
                        <View
                          accessibilityLiveRegion="polite"
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Check size={17} color={c.accent} />
                          <Txt style={{ fontSize: 12 }}>
                            {l(
                              "Nouvelle demande envoyée. Utilisez le dernier e-mail reçu.",
                              "New request sent. Use the most recent email.",
                            )}
                          </Txt>
                        </View>
                      )}
                    </>
                  )}
                  {(feedback || auth.error) && (
                    <View
                      nativeID="auth-feedback"
                      accessibilityRole="alert"
                      accessibilityLiveRegion="assertive"
                      style={{
                        backgroundColor: c.errorBg,
                        borderRadius: 12,
                        padding: 14,
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 9,
                      }}
                    >
                      <CircleAlert size={17} color={c.error} />
                      <Txt style={{ flex: 1, color: c.error, fontSize: 12 }}>
                        {feedback?.message ??
                          (auth.error === "Connexion Google annulée."
                            ? l(
                                "Connexion Google annulée. Vous pouvez réessayer ou utiliser votre e-mail.",
                                "Google sign-in was cancelled. You can try again or use your email.",
                              )
                            : l(
                                "La connexion n’a pas abouti. Réessayez depuis cet appareil.",
                                "Sign-in could not be completed. Please try again on this device.",
                              ))}
                      </Txt>
                    </View>
                  )}
                  <Txt muted style={{ fontSize: 11, lineHeight: 18 }}>
                    {mode === "signup"
                      ? l(
                          "À la création, votre progression invitée sera importée après vérification. Votre e-mail et vos résultats servent à synchroniser votre compte. Aucune donnée de patient.",
                          "When you create an account, your guest progress is imported after verification. Your email and results are used to sync your account. No patient data.",
                        )
                      : l(
                          "Votre e-mail sert à vous connecter et à retrouver votre progression. Vos résultats invités restent disponibles sur cet appareil.",
                          "Your email lets you sign in and find your progress. Your guest results stay available on this device.",
                        )}
                  </Txt>
                </View>
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                paddingTop: 12,
                borderTopWidth: 1,
                borderColor: c.line,
              }}
            >
              <Pressable
                accessibilityRole="button"
                disabled={!!busy}
                onPress={leave}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ArrowLeft size={15} color={c.muted} />
                <Txt muted style={{ fontSize: 12 }}>
                  {l("Continuer sans compte", "Continue without an account")}
                </Txt>
                <ChevronRight size={14} color={c.muted} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
