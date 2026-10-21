import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { ArrowUpRight, ScanLine, Stethoscope } from "lucide-react-native";
import { useI18n } from "../i18n";
import { Organ, Txt } from "./components";
export function HomeLearningSpaces({ onAnatomy, onSpecialties }: { onAnatomy: () => void; onSpecialties: () => void }) {
  const { language } = useI18n();
  const { width } = useWindowDimensions();
  const en = language === "en";
  const spaces = [
    { id: "anatomy", title: en ? "Anatomy" : "Anatomie", eyebrow: en ? "EXPLORE & REMEMBER" : "EXPLORER & MÉMORISER", body: en ? "The body in 3D. Muscles, attachments and focused quizzes." : "Le corps en 3D. Muscles, attaches et quiz ciblés.", action: en ? "Explore the human body" : "Explorer le corps humain", onPress: onAnatomy, icon: ScanLine, organ: "body" as const, tint: "#aeeb23" },
    { id: "specialties", title: en ? "Specialties" : "Spécialités", eyebrow: en ? "REASON & PRACTISE" : "RAISONNER & S’ENTRAÎNER", body: en ? "Clinical cases, discriminating clues and detailed explanations." : "Des cas cliniques, des indices et des corrigés pour comprendre.", action: en ? "Explore specialties" : "Explorer les spécialités", onPress: onSpecialties, icon: Stethoscope, organ: "heart" as const, tint: "#cebbff" },
  ];
  return <View testID="home-learning-spaces" style={{ flexDirection: width >= 900 ? "row" : "column", gap: 16 }}>
    {spaces.map((space) => <Pressable key={space.id} testID={`home-space-${space.id}`} accessibilityRole="button" accessibilityLabel={space.action} onPress={space.onPress}
      style={({ pressed, hovered }: any) => ({ flex: 1, minHeight: 218, padding: 25, borderRadius: 22, overflow: "hidden", backgroundColor: "#291343", borderWidth: 1, borderColor: hovered ? "#aeeb23" : "#49315f", opacity: pressed ? 0.9 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><space.icon color={space.tint} size={19} /><Txt style={{ color: "#d4c7e4", fontSize: 10, letterSpacing: 1 }}>{space.eyebrow}</Txt></View>
        <ArrowUpRight color={space.tint} size={22} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 17, gap: 20 }}>
        <View style={{ flex: 1, gap: 8 }}><Txt style={{ color: "#fff", fontSize: 29, fontWeight: "700", letterSpacing: -0.8 }}>{space.title}</Txt><Txt style={{ color: "#d0c3de", fontSize: 13 }}>{space.body}</Txt></View>
        <Organ kind={space.organ} color={space.tint} size={78} />
      </View>
      <Txt style={{ color: space.tint, marginTop: 17, fontSize: 12, fontWeight: "600" }}>{space.action} →</Txt>
    </Pressable>)}
  </View>;
}
