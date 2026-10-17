import React, { createContext, useContext } from "react";
import { useStore } from "../state";
export const light = {
  bg: "#f6f8fa",
  card: "#ffffff",
  text: "#203c40",
  muted: "#61777b",
  line: "#e7edef",
  accent: "#247b70",
  soft: "#eaf4f0",
  hero: "#eaf3ee",
  error: "#a94747",
  errorBg: "#fff0ed",
  navy: "#24464b",
  yellow: "#f6e8c7",
};
const dark: typeof light = {
  bg: "#13282c",
  card: "#1b3539",
  text: "#edf6f2",
  muted: "#acbdbd",
  line: "#315054",
  accent: "#84d3bb",
  soft: "#294a43",
  hero: "#25463e",
  error: "#ffb5a8",
  errorBg: "#503330",
  navy: "#c3e2dd",
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
