import React from "react";
import { Pressable, Text, View } from "react-native";
import { useI18n, type Language } from "../i18n";
import { useTheme } from "./theme";
export function LanguageSwitch() {
  const { language, setLanguage } = useI18n();
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 9,
        padding: 2,
      }}
    >
      {(["fr", "en"] as Language[]).map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={value === "fr" ? "Français" : "English"}
          accessibilityState={{ selected: language === value }}
          aria-pressed={language === value}
          onPress={() => setLanguage(value)}
          style={{
            paddingHorizontal: 9,
            minHeight: 34,
            justifyContent: "center",
            borderRadius: 6,
            backgroundColor: value === language ? c.soft : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: value === language ? c.accent : c.muted,
              fontWeight: value === language ? "700" : "400",
            }}
          >
            {value.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
