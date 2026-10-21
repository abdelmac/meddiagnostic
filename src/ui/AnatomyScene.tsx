import React from "react";
import { Text, View } from "react-native";
import { HumanFigure } from "./anatomy-vector";
import type { AnatomySceneProps } from "./anatomy-scene-types";

export type { AnatomySceneProps } from "./anatomy-scene-types";

/** Native remains an accessible 2D view; WebGL is delivered by AnatomyScene.web. */
export function AnatomyScene({ isolate, selectedId, language = "fr", ...props }: AnatomySceneProps) {
  return <View>
    <HumanFigure {...props} language={language} selectedId={selectedId} targetOnly={isolate} />
    <Text style={{ color: "#aebfb8", fontSize: 11, textAlign: "center", padding: 8 }}>
      {language === "fr" ? "Vue 2D — exploration 3D disponible sur le site web." : "2D view — explore in 3D on the website."}
    </Text>
  </View>;
}
