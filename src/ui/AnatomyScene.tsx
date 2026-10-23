import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import defaultManifest from "../data/bodyparts3d-manifest.json";
import { anatomyStructure } from "../data/anatomy-structures";
import {
  parseAnatomyNativeEvent,
  parseAnatomyNativeState,
  validAnatomyBridgeId,
  type NativeAnatomyState,
} from "../domain/anatomy-native-bridge";
import AnatomySceneDOM from "./AnatomyScene.dom";
import { HumanFigure } from "./anatomy-vector";
import type { AnatomySceneProps } from "./anatomy-scene-types";
import type { BodyPartsManifest } from "./anatomy-gltf.web";
export type { AnatomySceneProps } from "./anatomy-scene-types";

const clamp = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback);
const counter = (value: number | undefined) =>
  Number.isSafeInteger(value) && value! >= 0 ? value! : 0;

/** Local Expo DOM bundle: only public geometry uses the network. */
export function AnatomyScene(props: AnatomySceneProps) {
  const manifest =
    props.sourceManifest ?? (defaultManifest as unknown as BodyPartsManifest);
  const source =
    manifest.datasetId === "bodyparts3d-3.0-95" ? "detailed" : "extended";
  const allowedIds = useMemo(
    () =>
      new Set([
        ...manifest.meshes.map((mesh) => mesh.id),
        ...Object.keys(manifest.legacyMapping ?? {}),
      ]),
    [manifest],
  );
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"starting" | "active" | "failed">(
    "starting",
  );
  const [fallback, setFallback] = useState(false);
  const currentGeneration = useRef({ source, attempt });
  currentGeneration.current = { source, attempt };
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const l = (fr: string, en: string) => (props.language === "en" ? en : fr);
  const height = clamp(props.height, 580, 120, 1600);
  const state = parseAnatomyNativeState({
    version: 1,
    source,
    system: props.system,
    view: props.view,
    language: props.language ?? "fr",
    appearance: props.appearance ?? "natural",
    selectedId:
      props.selectedId && allowedIds.has(props.selectedId)
        ? props.selectedId
        : undefined,
    zoom: clamp(props.zoom, 1, 1, 4),
    height,
    opacity: clamp(props.opacity, 1, 0, 1),
    isolate: props.isolate ?? false,
    isolatedDetail: props.isolatedDetail ?? false,
    hiddenIds: [
      ...new Set((props.hiddenIds ?? []).filter(validAnatomyBridgeId)),
    ].slice(0, 4000),
    visibleSystems: [
      ...new Set(
        props.visibleSystems?.length ? props.visibleSystems : [props.system],
      ),
    ],
    resetKey: counter(props.resetKey),
    focusSelectionKey: counter(props.focusSelectionKey),
    focusRegionKey: counter(props.focusRegionKey),
    focusRegionBounds: props.focusRegionBounds,
  });
  useEffect(() => {
    setPhase("starting");
  }, [source, attempt]);
  useEffect(() => {
    if (phase !== "starting" || fallback) return;
    const timer = setTimeout(() => setPhase("failed"), 20000);
    return () => clearTimeout(timer);
  }, [phase, source, attempt, fallback]);
  const onEvent = useCallback(
    async (value: unknown) => {
      if (
        !mounted.current ||
        currentGeneration.current.source !== source ||
        currentGeneration.current.attempt !== attempt
      )
        return;
      const event = parseAnatomyNativeEvent(value, allowedIds, source);
      if (!event) return;
      if (event.type === "mounted") setPhase("active");
      else if (event.type === "error") setPhase("failed");
      else if (event.type === "select") props.onSelect?.(event.id);
      else if (event.type === "ready") {
        setPhase("active");
        props.onReady?.({
          meshCount: event.meshCount,
          structureIds: event.structureIds,
        });
      }
    },
    [allowedIds, source, attempt, props.onSelect, props.onReady],
  );
  const restart = () => {
    setFallback(false);
    setPhase("starting");
    setAttempt((n) => n + 1);
  };
  const fallbackId =
    props.selectedId && anatomyStructure(props.selectedId)
      ? props.selectedId
      : manifest.meshes.find((mesh) => mesh.id === props.selectedId)
          ?.legacyIds?.[0];
  const failed = phase === "failed" || !state;
  if (fallback || failed)
    return (
      <View
        style={{
          minHeight: height,
          backgroundColor: "#171120",
          borderRadius: 12,
        }}
      >
        <HumanFigure
          system={props.system}
          view={props.view}
          selectedId={fallbackId}
          onSelect={props.onSelect}
          zoom={props.zoom}
          height={height - 85}
          language={props.language ?? "fr"}
          targetOnly={props.isolate}
        />
        <Text
          accessibilityRole={failed ? "alert" : undefined}
          style={{
            color: "#d3c6dd",
            fontSize: 13,
            textAlign: "center",
            padding: 10,
          }}
        >
          {failed
            ? l(
                "La 3D n’a pas pu démarrer. Les schémas 2D restent disponibles.",
                "3D could not start. The 2D diagrams remain available.",
              )
            : l(
                "Schéma 2D des repères de cours.",
                "2D course landmark diagram.",
              )}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={restart}
          style={{ padding: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#d2ef9b", fontWeight: "700" }}>
            {l("Réessayer la 3D", "Retry 3D")}
          </Text>
        </Pressable>
      </View>
    );
  return (
    <View
      style={{
        height,
        backgroundColor: "#171120",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <AnatomySceneDOM
        key={`${source}:${attempt}`}
        state={state as NativeAnatomyState}
        onEvent={onEvent}
        dom={{
          useExpoDOMWebView: true,
          unstable_useExpoModulesBridge: false,
          scrollEnabled: false,
          nestedScrollEnabled: true,
          bounces: false,
          showsHorizontalScrollIndicator: false,
          showsVerticalScrollIndicator: false,
          automaticallyAdjustContentInsets: false,
          contentInsetAdjustmentBehavior: "never",
          style: { width: "100%", height },
          containerStyle: { width: "100%", height },
          onContentProcessDidTerminate: () => setPhase("failed"),
          onRenderProcessGone: () => setPhase("failed"),
        }}
      />
      {phase === "starting" && (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            alignItems: "center",
          }}
        >
          <ActivityIndicator color="#b4ec28" />
          <Text style={{ color: "#d3c6dd", marginTop: 10 }}>
            {l("Démarrage de l’atlas 3D…", "Starting the 3D atlas…")}
          </Text>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={l("Afficher les schémas 2D", "Show 2D diagrams")}
        onPress={() => setFallback(true)}
        style={{
          position: "absolute",
          right: 10,
          bottom: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 8,
          backgroundColor: "#30233f",
        }}
      >
        <Text style={{ color: "#efe5f4", fontSize: 12 }}>
          {l("Vue 2D", "2D view")}
        </Text>
      </Pressable>
    </View>
  );
}
