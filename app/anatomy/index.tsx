import React from "react";
import { Platform, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnatomyStudyWorkspace } from "../../src/ui/AnatomyStudyWorkspace";

export default function AnatomyStudyPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    structure?: string;
    year?: string;
    focus?: string;
  }>();
  const { height } = useWindowDimensions();
  const year = Math.min(12, Math.max(1, Number(params.year) || 1));
  return (
    <SafeAreaView
      edges={["top", "right", "bottom", "left"]}
      style={{
        flex: 1,
        backgroundColor: "#111219",
        ...(Platform.OS === "web"
          ? { height, overflow: "hidden" as const }
          : {}),
      }}
    >
      <StatusBar style="light" />
      <AnatomyStudyWorkspace
        focusRequest={
          typeof params.focus === "string" ? params.focus : undefined
        }
        initialStructureId={
          typeof params.structure === "string" ? params.structure : undefined
        }
        onExit={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
        onCourse={() =>
          router.push({ pathname: "/anatomy/courses", params: { year } })
        }
        onPractice={(focus, structure) =>
          router.push({
            pathname: "/",
            params: {
              practice: "anatomy",
              year,
              ...(focus ? { objective: focus } : {}),
              ...(structure ? { structure } : {}),
            },
          })
        }
      />
    </SafeAreaView>
  );
}
