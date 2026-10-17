import { useI18n } from "../i18n";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { ArrowRight, type LucideIcon } from "lucide-react-native";
import { useTheme } from "./theme";
import { useStore } from "../state";
export function Txt({
  children,
  style,
  muted,
  ...props
}: React.ComponentProps<typeof Text> & { muted?: boolean }) {
  const { t } = useI18n();
  const c = useTheme();
  const { state } = useStore();
  const resolved = StyleSheet.flatten(style) ?? {};
  const scale = state.preferences.largeText ? 1.22 : 1;
  const fontSize = Math.max(11, resolved.fontSize ?? 14) * scale;
  const lineHeight =
    Math.max(resolved.lineHeight ?? 23, fontSize * 1.35) *
    (state.preferences.largeText ? 1.1 : 1);
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: "System",
          flexShrink: 1,
          fontSize: 14,
          color: muted ? c.muted : c.text,
          lineHeight: 23,
        },
        style,
        { fontSize, lineHeight },
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" ? t(child) : child,
      )}
    </Text>
  );
}
export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return (
    <Txt
      accessibilityRole="header"
      style={[
        { fontSize: 30, fontWeight: "700", lineHeight: 40, letterSpacing: -1 },
        style,
      ]}
    >
      {children}
    </Txt>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: c.line,
          padding: 24,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary,
  disabled,
  icon: Icon = ArrowRight,
  small,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  small?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        {
          minHeight: small ? 40 : 48,
          maxWidth: "100%",
          paddingHorizontal: small ? 14 : 21,
          borderRadius: 10,
          backgroundColor: secondary ? c.card : c.accent,
          borderWidth: 1,
          borderColor: secondary ? c.line : c.accent,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        hovered && !disabled ? { transform: [{ translateY: -1 }] } : {},
      ]}
    >
      <Txt
        style={{
          color: secondary ? c.text : "#fff",
          fontWeight: "600",
          fontSize: 13,
        }}
      >
        {label}
      </Txt>
      <Icon size={16} color={secondary ? c.accent : "#fff"} />
    </Pressable>
  );
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        maxWidth: "100%",
        paddingVertical: 8,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.line,
        backgroundColor: selected ? c.soft : c.card,
      }}
    >
      <Txt
        style={{
          fontSize: 12,
          fontWeight: selected ? "600" : "400",
          color: selected ? c.accent : c.muted,
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
}
export function Bar({ value, color }: { value: number; color?: string }) {
  const c = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={{
        height: 6,
        backgroundColor: c.line,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: 6,
          backgroundColor: color ?? c.accent,
          borderRadius: 8,
        }}
      />
    </View>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Card style={{ alignItems: "center", padding: 36, gap: 10 }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: c.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Txt style={{ fontSize: 24 }}>✧</Txt>
      </View>
      <Title style={{ fontSize: 20 }}>{title}</Title>
      <Txt muted style={{ textAlign: "center", maxWidth: 450 }}>
        {description}
      </Txt>
      {action}
    </Card>
  );
}
export function Loading() {
  const { t, language } = useI18n();

  const c = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: c.bg,
        gap: 12,
      }}
    >
      <ActivityIndicator color={c.accent} />
      <Txt>{t("Votre espace se prépare…")}</Txt>
    </View>
  );
}
// Decorative anatomy-inspired artwork; never a diagnostic reference.
export function Organ({
  kind,
  size = 90,
  color = "#a85f6c",
}: {
  kind: "heart" | "lungs" | "skin";
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessibilityElementsHidden
    >
      <Circle cx="60" cy="60" r="52" fill={color} opacity=".07" />
      {kind === "heart" ? (
        <>
          <Path
            d="M59 35 C45 11 19 27 28 54 C33 70 49 89 63 101 C74 85 101 70 96 48 C92 31 75 27 63 40 L59 35Z"
            fill={color}
            opacity=".72"
          />
          <Path
            d="M57 40 L55 18 L65 16 L69 37 M70 38 L77 20 L86 24 L80 44"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <Path
            d="M61 43 Q49 66 63 92 M62 60 L82 54 M60 72 L42 64"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            opacity=".55"
          />
        </>
      ) : kind === "lungs" ? (
        <>
          <Path
            d="M50 30 C37 22 17 52 19 78 C20 98 48 90 51 77Z M70 30 C83 22 103 52 101 78 C100 98 72 90 69 77Z"
            fill={color}
            opacity=".6"
          />
          <Path
            d="M60 18 L60 53 M60 47 L39 68 M60 47 L81 68 M40 65 L29 63 M41 65 L37 80 M79 65 L91 63 M79 65 L83 80"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <Path d="M60 18 L60 43" stroke="#fff" strokeWidth="1" />
        </>
      ) : (
        <>
          <Path
            d="M23 39 Q38 29 51 38 T79 38 T102 39 L102 86 L23 86Z"
            fill={color}
            opacity=".25"
          />
          <Path
            d="M23 39 Q38 29 51 38 T79 38 T102 39 M23 52 Q38 42 51 51 T79 51 T102 52"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <Path
            d="M46 28 Q61 46 54 76 M70 25 Q79 48 72 77"
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
          <Circle cx="44" cy="64" r="4" fill={color} />
          <Circle cx="87" cy="69" r="4" fill={color} />
          <Line
            x1="28"
            y1="81"
            x2="96"
            y2="81"
            stroke={color}
            strokeWidth="2"
          />
        </>
      )}
    </Svg>
  );
}
export const row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
};
export const wrap: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
};
