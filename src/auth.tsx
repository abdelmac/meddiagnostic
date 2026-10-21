import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Linking, Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "./services/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_DESTINATION_KEY, AUTH_MODE_KEY, AUTH_PENDING_REQUEST_KEY } from "./domain/auth-navigation";
import {
  callbackError,
  cleanAuthCallbackURL,
  nativeAuthCallback,
} from "./domain/auth-callback";
import {
  googleProviderStatus,
  type GoogleStatus,
} from "./services/auth-providers";
const OAUTH_IMPORT = "medquiz.pending-oauth-import";
type Auth = {
  user: User | null;
  ready: boolean;
  configured: boolean;
  googleStatus: GoogleStatus;
  error: string;
  clearError: () => void;
  signInWithGoogle: (create: boolean) => Promise<void>;
  sendCode: (email: string, create: boolean) => Promise<void>;
  verifyCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>("checking");
  const [error, setError] = useState("");
  const sequence = useRef(0);
  useEffect(() => {
    let alive = true;
    void googleProviderStatus(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ).then((status) => {
      if (alive) setGoogleStatus(status);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!client) {
      setReady(true);
      return;
    }
    let alive = true;
    const consumedCodes = new Set<string>();
    const applySession = async (session: Session | null) => {
      const current = ++sequence.current;
      if (session?.user) await AsyncStorage.removeItem(AUTH_PENDING_REQUEST_KEY).catch(() => {});
      // Bind an explicit create-with-Google request to the account Google
      // actually verified, before the account store attempts guest import.
      if (
        session?.user.email &&
        session.user.identities?.some(
          (identity) => identity.provider === "google",
        )
      ) {
        const raw = await AsyncStorage.getItem(OAUTH_IMPORT).catch(() => null);
        if (raw) {
          const startedAt = Number(raw);
          const age = Date.now() - startedAt;
          if (Number.isFinite(startedAt) && age >= 0 && age < 15 * 60 * 1000)
            await AsyncStorage.setItem(
              "medquiz.pending-import",
              session.user.email.toLowerCase(),
            );
          await AsyncStorage.removeItem(OAUTH_IMPORT);
        }
      }
      if (alive && current === sequence.current) {
        setUser(session?.user ?? null);
        setReady(true);
      }
    };
    const initialURL =
      Platform.OS === "web" && typeof window !== "undefined"
        ? new URL(window.location.href)
        : null;
    client.auth
      .initialize()
      .then(async ({ error: initializationError }) => {
        const { data, error: sessionError } = await client.auth.getSession();
        if (alive && initialURL) {
          const issue = callbackError(initialURL);
          if (issue || initializationError || sessionError) {
            setError(
              issue === "cancelled"
                ? "Connexion Google annulée."
                : "La connexion a échoué. Recommencez depuis cet appareil.",
            );
            await AsyncStorage.removeItem(OAUTH_IMPORT);
          }
          const cleaned = cleanAuthCallbackURL(window.location.href);
          if (cleaned !== window.location.href)
            window.history.replaceState(window.history.state, "", cleaned);
        }
        await applySession(data.session);
      })
      .catch(() => {
        if (alive) setReady(true);
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      // Do not call Auth methods from inside this callback's SDK lock.
      void applySession(session).catch(() => {
        if (alive) {
          setError(
            "L’import de la progression a échoué. Réessayez depuis votre profil.",
          );
          setUser(session?.user ?? null);
          setReady(true);
        }
      });
    });
    const consumeLink = async (raw: string | null | undefined) => {
      if (!raw) return;
      const callback = nativeAuthCallback(raw);
      if (!callback) return;
      if (callback.error) {
        if (alive)
          setError(
            callback.error === "cancelled"
              ? "Connexion Google annulée."
              : "La connexion a échoué. Recommencez depuis cet appareil.",
          );
        await AsyncStorage.removeItem(OAUTH_IMPORT);
        return;
      }
      if (consumedCodes.has(callback.code)) return;
      consumedCodes.add(callback.code);
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(
        callback.code,
      );
      if (exchangeError && alive)
        setError("La connexion a échoué. Recommencez depuis cet appareil.");
    };
    const linkListener =
      Platform.OS !== "web"
        ? Linking.addEventListener("url", ({ url }) => {
            void consumeLink(url).catch(() => {
              if (alive)
                setError(
                  "La connexion a échoué. Recommencez depuis cet appareil.",
                );
            });
          })
        : null;
    if (Platform.OS !== "web")
      void Linking.getInitialURL()
        .then(consumeLink)
        .catch(() => {});
    const listener =
      Platform.OS !== "web"
        ? AppState.addEventListener("change", (status) => {
            if (status === "active") client.auth.startAutoRefresh();
            else client.auth.stopAutoRefresh();
          })
        : null;
    return () => {
      alive = false;
      subscription.unsubscribe();
      listener?.remove();
      linkListener?.remove();
    };
  }, [client]);
  const signInWithGoogle = async (create: boolean) => {
    if (!client || googleStatus !== "enabled")
      throw Error("Connexion Google indisponible pour le moment.");
    setError("");
    await AsyncStorage.removeItem("medquiz.pending-import");
    if (create) await AsyncStorage.setItem(OAUTH_IMPORT, String(Date.now()));
    else await AsyncStorage.removeItem(OAUTH_IMPORT);
    try {
      const { data, error: oauthError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            Platform.OS === "web" && typeof window !== "undefined"
              ? window.location.origin
              : "medquiz://auth/callback",
          skipBrowserRedirect: Platform.OS !== "web",
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
      if (Platform.OS !== "web" && data.url) await Linking.openURL(data.url);
    } catch (issue) {
      await AsyncStorage.removeItem(OAUTH_IMPORT);
      throw issue;
    }
  };
  const sendCode = async (email: string, create: boolean) => {
    if (!client) throw Error("Comptes indisponibles pour le moment.");
    setError("");
    await AsyncStorage.removeItem(OAUTH_IMPORT);
    if (create)
      await AsyncStorage.setItem(
        "medquiz.pending-import",
        email.trim().toLowerCase(),
      );
    else await AsyncStorage.removeItem("medquiz.pending-import");
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: create,
        emailRedirectTo:
          Platform.OS === "web" && typeof window !== "undefined"
            ? window.location.origin
            : "medquiz://auth/callback",
      },
    });
    if (error) throw error;
  };
  const verifyCode = async (email: string, token: string) => {
    if (!client) throw Error("Comptes indisponibles pour le moment.");
    const { error } = await client.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });
    if (error) throw error;
  };
  const signOut = async () => {
    if (!client) return;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw error;
    setError("");
    await AsyncStorage.multiRemove([OAUTH_IMPORT, "medquiz.pending-import", AUTH_PENDING_REQUEST_KEY, AUTH_DESTINATION_KEY, AUTH_MODE_KEY]);
  };
  return (
    <Context.Provider
      value={{
        user,
        ready,
        configured: !!client,
        googleStatus,
        error,
        clearError: () => setError(""),
        signInWithGoogle,
        sendCode,
        verifyCode,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
