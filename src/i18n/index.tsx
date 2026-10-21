import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { en } from "./en";
export type Language = "fr" | "en";
const KEY = "medquiz.language.v1";
export function translate(
  language: Language,
  message: string,
  params: Record<string, unknown> = {},
) {
  const template = language === "en" ? (en[message] ?? message) : message;
  return template.replace(/\{(\d+)\}/g, (_, id: string) => {
    const value = String(params[id] ?? "");
    return language === "en" ? (en[value] ?? value) : value;
  });
}
type I18n = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (message: string, params?: Record<string, unknown>) => string;
};
const Context = createContext<I18n>({
  language: "fr",
  setLanguage: () => {},
  t: (m) => m,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setValue] = useState<Language>("fr");
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        const requested =
          Platform.OS === "web" && typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("lang")
            : null;
        if (active)
          setValue(
            requested === "en" || requested === "fr"
              ? requested
              : saved === "en" || saved === "fr"
                ? saved
                : Intl.DateTimeFormat()
                      .resolvedOptions()
                      .locale.toLowerCase()
                      .startsWith("fr")
                  ? "fr"
                  : "en",
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.lang = language;
      const authenticationPage = window.location.pathname.replace(/\/$/, "") === "/auth";
      document.title = authenticationPage
        ? language === "fr" ? "Connexion et inscription · Ippomed" : "Sign in and create an account · Ippomed"
        : language === "fr"
          ? "Ippomed — Apprendre, comprendre, retenir"
          : "Ippomed — Learn, understand, remember";
    }
  }, [language]);
  const setLanguage = (value: Language) => {
    setValue(value);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", value);
      window.history.replaceState(window.history.state, "", url);
    }
    AsyncStorage.setItem(KEY, value).catch(() => {});
  };
  return (
    <Context.Provider
      value={{ language, setLanguage, t: (m, p) => translate(language, m, p) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useI18n = () => useContext(Context);
