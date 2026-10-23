import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AnatomyCoursesPanel } from "../../src/ui/AnatomyCoursesPanel";
import { Button } from "../../src/ui/components";
import { LanguageSwitch } from "../../src/ui/LanguageSwitch";
import { useI18n } from "../../src/i18n";

export default function AnatomyCoursesPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string }>();
  const { language } = useI18n();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f5fb" }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
          padding: 14,
        }}
      >
        <Button
          small
          secondary
          icon={ArrowLeft}
          label={language === "fr" ? "Retour au corps" : "Back to the body"}
          onPress={() =>
            router.navigate({
              pathname: "/anatomy",
              params: {
                year: Math.min(12, Math.max(1, Number(params.year) || 1)),
              },
            })
          }
        />
        <LanguageSwitch />
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: 18,
          paddingBottom: 40,
          maxWidth: 1100,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <AnatomyCoursesPanel
          initialYear={Number(params.year) || 1}
          onExplore={(year, structure) =>
            router.navigate({
              pathname: "/anatomy",
              params: {
                year,
                ...(structure
                  ? { structure, focus: Date.now().toString(36) }
                  : {}),
              },
            })
          }
          onPractice={(year, objective, structure) =>
            router.push({
              pathname: "/",
              params: {
                practice: "anatomy",
                year,
                ...(objective ? { objective } : {}),
                ...(structure ? { structure } : {}),
              },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
