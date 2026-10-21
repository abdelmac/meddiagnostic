import React, { createContext, useContext } from "react";
import { useStore } from "../state";
export const light = {
  bg: "#f6f5fb",
  card: "#ffffff",
  text: "#251244",
  muted: "#706681",
  line: "#e9e4f1",
  accent: "#6024df",
  soft: "#f0eaff",
  hero: "#f1ecfc",
  error: "#a94747",
  errorBg: "#fff0ed",
  navy: "#2d154f",
  yellow: "#f6e8c7",
};
const dark: typeof light = {
  bg: "#171021",
  card: "#241a32",
  text: "#f7f2ff",
  muted: "#b6abc9",
  line: "#3c2d50",
  accent: "#bc9aff",
  soft: "#36234f",
  hero: "#302141",
  error: "#ffb5a8",
  errorBg: "#503330",
  navy: "#e4d5fa",
  yellow: "#51472c",
};
const Theme = createContext(light);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  return (
    <Theme.Provider value={state.preferences.dark ? dark : light}>
      {children}
    </Theme.Provider>
  );
}
export const useTheme = () => useContext(Theme);
