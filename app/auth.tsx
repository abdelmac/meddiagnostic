import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../src/auth";
import {
  authDestination,
  authDestinationURL,
} from "../src/domain/auth-navigation";
import { AuthenticationScreen } from "../src/ui/AuthenticationScreen";
import { useI18n } from "../src/i18n";
import { Platform } from "react-native";

export default function AuthenticationPage() {
  const params = useLocalSearchParams<{ mode?: string; next?: string }>();
  const router = useRouter();
  const { user, ready } = useAuth();
  const { language } = useI18n();
  const destination = authDestination(params.next);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const previous = document.title;
    document.title =
      language === "fr"
        ? "Connexion et inscription · Ippomed"
        : "Sign in and create an account · Ippomed";
    return () => {
      document.title = previous;
    };
  }, [language]);
  useEffect(() => {
    if (ready && user) router.replace(authDestinationURL(destination));
  }, [user, ready, destination, router]);
  if (user) return null;
  return (
    <AuthenticationScreen
      initialMode={params.mode === "signup" ? "signup" : "login"}
      destination={destination}
    />
  );
}
