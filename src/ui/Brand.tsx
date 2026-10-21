import React from "react";
import { Image, View } from "react-native";
import { Txt } from "./components";
import { useTheme } from "./theme";
export function Brand({ compact = false }: { compact?: boolean }) {
  const c = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: compact ? 7 : 10 }}>
    <Image source={require("../../public/brand/ippomed-emblem.png")} accessibilityLabel="Logo Ippomed" style={{ width: compact ? 43 : 50, height: compact ? 43 : 50 }} resizeMode="contain" />
    <Txt style={{ fontSize: compact ? 22 : 26, fontWeight: "800", letterSpacing: -1.1, color: c.text }}>ippomed</Txt>
  </View>;
}
