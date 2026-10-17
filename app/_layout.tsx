import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../src/state";
import { ThemeProvider } from "../src/ui/theme";
export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </StoreProvider>
  );
}
