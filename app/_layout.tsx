import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../src/state";
import { ThemeProvider } from "../src/ui/theme";
import { LanguageProvider, useI18n } from "../src/i18n";
import { AuthProvider, useAuth } from "../src/auth";
import { ActivityIndicator, Image, Text, View } from "react-native";

function AuthenticatedShell() {
  const { ready } = useAuth();
  const { language } = useI18n();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          minHeight: 400,
          backgroundColor: "#f6f5fb",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <Image
          source={require("../public/brand/ippomed-emblem.png")}
          accessibilityLabel="Ippomed"
          style={{ width: 70, height: 70 }}
          resizeMode="contain"
        />
        <ActivityIndicator color="#6024df" />
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontSize: 14, color: "#706681" }}
        >
          {language === "fr"
            ? "Préparation de votre espace…"
            : "Preparing your space…"}
        </Text>
      </View>
    );
  return (
    <StoreProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </StoreProvider>
  );
}
export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AuthenticatedShell />
      </AuthProvider>
    </LanguageProvider>
  );
}
