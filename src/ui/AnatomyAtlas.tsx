import { useAnatomyAtlas } from "./useAnatomyAtlas";
import { AnatomyInspector, AnatomyStructureSearch } from "./anatomy-panels";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Activity,
  ArrowUpRight,
  Bone,
  Eye,
  EyeOff,
  Focus,
  Heart,
  Layers3,
  Maximize2,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react-native";
import {
  anatomySystem,
  anatomySystems,
  type AnatomySystem,
  type AnatomyView,
} from "../data/anatomy-structures";
import {
  atlasCatalog,
  anatomySearchKey,
  type AtlasSource,
} from "../data/anatomy-catalog";
import { muscleAttachments } from "../data/muscle-attachments";
import { anatomyRegions, type AnatomyBounds } from "../data/anatomy-regions";
import type { AnatomyFocus } from "../domain/types";
import { useI18n } from "../i18n";
import { Button, Title, Txt, wrap } from "./components";
import { HumanFigure } from "./anatomy-vector";
import { AnatomyScene } from "./AnatomyScene";

const icons = {
  muscles: Activity,
  nerves: Zap,
  skeleton: Bone,
  organs: Heart,
  vessels: Network,
};
const focusLabels = {
  origin: { fr: "Origines", en: "Origins" },
  insertion: { fr: "Insertions", en: "Insertions" },
  action: { fr: "Actions", en: "Actions" },
  innervation: { fr: "Innervation", en: "Innervation" },
};

export function AnatomyAtlas({
  initialStructureId,
  onPractice,
}: {
  initialStructureId?: string;
  onPractice?: (focus?: AnatomyFocus, structureId?: string) => void;
}) {
  const atlas = useAnatomyAtlas({ initialStructureId });
  const {
    language,
    width,
    compact,
    l,
    sourceId,
    setSourceId,
    catalog,
    anatomyModelManifest,
    anatomyModelMeshes,
    atlasLandmarks,
    atlasMeshStructures,
    atlasStructure,
    atlasQuizStructureId,
    detailMeshIds,
    initial,
    system,
    setSystem,
    view,
    setView,
    selectedId,
    setSelectedId,
    mode,
    setMode,
    overlays,
    setOverlays,
    zoom,
    setZoom,
    search,
    setSearch,
    resultLimit,
    setResultLimit,
    isolate,
    setIsolate,
    detailMode,
    setDetailMode,
    opacity,
    setOpacity,
    hiddenIds,
    setHiddenIds,
    inspector,
    setInspector,
    reset,
    setReset,
    focusKey,
    setFocusKey,
    regionBounds,
    setRegionBounds,
    regionKey,
    setRegionKey,
    activeRegion,
    setActiveRegion,
    expanded,
    setExpanded,
    sourceError,
    setSourceError,
    stage,
    revealStage,
    selected,
    palette,
    regions,
    muscle,
    quizId,
    alternateSource,
    alternateStructure,
    detailAvailable,
    visibleSystems,
    hidden,
    query,
    landmarks,
    results,
    select,
    changeSource,
    changeSystem,
    changeMode,
    changeView,
    toggleHidden,
    restore,
    appearance,
    setAppearance,
  } = atlas;
  const tool = (
    label: string,
    Icon: typeof Eye,
    action: () => void,
    active = false,
    disabled = false,
  ) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-pressed={active}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={action}
      style={({ hovered }: any) => ({
        minHeight: 42,
        padding: 11,
        borderRadius: 10,
        backgroundColor: active ? "#b7e85c" : hovered ? "#44334f" : "#30243c",
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Icon size={16} color={active ? "#231338" : "#e5dced"} />
      <Txt
        style={{
          color: active ? "#231338" : "#e5dced",
          fontSize: 11,
          fontWeight: "600",
        }}
      >
        {label}
      </Txt>
    </Pressable>
  );
  const structureButton = (item: typeof selected, study = false) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={item.name[language]}
      aria-pressed={item.id === selectedId}
      onPress={() => select(item.id)}
      style={{
        minHeight: 40,
        borderWidth: 1,
        borderColor:
          item.id === selectedId ? "#b7e85c" : study ? "#705388" : "#49384f",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9,
        backgroundColor:
          item.id === selectedId ? "#39482a" : study ? "#372345" : "#281d32",
        maxWidth: "100%",
      }}
    >
      <Txt
        style={{
          color: item.id === selectedId ? "#e7f9c9" : "#d9c9e3",
          fontSize: 12,
        }}
      >
        {item.name[language]}
        {sourceId === "extended" &&
        mode === "3d" &&
        item.meshIds.length > 0 &&
        item.meshIds.every((id) => detailMeshIds.has(id))
          ? " · HD"
          : ""}
      </Txt>
    </Pressable>
  );
  const stageHeight = expanded ? (compact ? 660 : 850) : compact ? 510 : 690;

  return (
    <View style={{ gap: 17 }}>
      <View style={{ gap: 6 }}>
        <View
          style={[
            wrap,
            { alignItems: "center", justifyContent: "space-between" },
          ]}
        >
          <Title style={{ fontSize: 25 }}>
            {l("Atlas du corps humain", "Human body atlas")}
          </Title>
          <Txt muted style={{ fontSize: 11 }}>
            {anatomyModelMeshes.length.toLocaleString(
              language === "fr" ? "fr-FR" : "en-GB",
            )}{" "}
            {l(
              "maillages anatomiques · 5 systèmes",
              "anatomical meshes · 5 systems",
            )}
          </Txt>
        </View>
        <Txt muted>
          {l(
            "Cliquez sur le corps pour identifier une structure. Isolez-la, masquez ce qui la recouvre et explorez ses rapports.",
            "Click the body to identify a structure. Isolate it, hide overlying structures and explore its relationships.",
          )}
        </Txt>
        {mode === "3d" && (
          <View style={{ gap: 8 }}>
            <View style={[wrap, { gap: 8 }]}>
              {(["detailed", "extended"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value === "detailed"
                      ? l("Corps détaillé", "Detailed body")
                      : l("Atlas étendu", "Extended atlas")
                  }
                  aria-pressed={sourceId === value}
                  onPress={() => changeSource(value)}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 11,
                    minHeight: 43,
                    borderRadius: 11,
                    borderWidth: 1,
                    borderColor: sourceId === value ? "#6418ef" : "#d8cfe5",
                    backgroundColor: sourceId === value ? "#eee5ff" : "#ffffff",
                  }}
                >
                  <Txt
                    style={{
                      color: "#3b2058",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {value === "detailed"
                      ? l("Corps détaillé", "Detailed body")
                      : l("Atlas étendu", "Extended atlas")}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Txt muted style={{ fontSize: 11 }}>
              {sourceId === "detailed"
                ? l(
                    "Une même référence pour le corps entier. Les détails d’origine se chargent au zoom et au cadrage. Pour davantage de petites branches nerveuses et vasculaires, choisissez l’atlas étendu.",
                    "One reference for the whole body. Original details load as you zoom and focus. Choose the extended atlas for more small nerve and vessel branches.",
                  )
                : l(
                    "Un catalogue plus large de structures. Pour explorer une géométrie plus fine dans le corps entier, choisissez le corps détaillé. Les deux références restent séparées.",
                    "A wider catalogue of structures. Choose the detailed body for finer geometry throughout the body. The two references remain separate.",
                  )}
            </Txt>
          </View>
        )}
      </View>
      <View
        testID="anatomy-workspace"
        style={{
          borderRadius: 23,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#49354f",
          backgroundColor: "#17111f",
        }}
      >
        <View
          style={{
            padding: 14,
            borderBottomWidth: 1,
            borderColor: "#392c43",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: "#b7e85c",
              }}
            />
            <Txt
              style={{
                color: "#e9dfef",
                fontSize: 11,
                letterSpacing: 1.1,
                fontWeight: "700",
              }}
            >
              IPPOMED ATLAS
            </Txt>
            <Txt style={{ color: "#aa94bd", fontSize: 10 }}>BodyParts3D</Txt>
          </View>
          <View style={{ flexDirection: "row", gap: 5 }}>
            {(["3d", "2d"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                aria-pressed={mode === value}
                accessibilityLabel={
                  value === "3d"
                    ? l("Vue 3D", "3D view")
                    : l("Vue 2D", "2D view")
                }
                onPress={() => changeMode(value)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  minHeight: 40,
                  borderRadius: 8,
                  backgroundColor: mode === value ? "#c5a5ff" : "#2d2238",
                }}
              >
                <Txt
                  style={{
                    color: mode === value ? "#241535" : "#ddd0e7",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {value === "3d"
                    ? l("Explorer en 3D", "Explore in 3D")
                    : l("Schémas 2D", "2D diagrams")}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={{
            flexDirection: compact ? "column" : "row",
            alignItems: "stretch",
          }}
        >
          <View
            style={{
              width: compact ? "100%" : 84,
              flexDirection: compact ? "row" : "column",
              flexWrap: "wrap",
              padding: 9,
              gap: 7,
              borderRightWidth: compact ? 0 : 1,
              borderBottomWidth: compact ? 1 : 0,
              borderColor: "#392c43",
              backgroundColor: "#201629",
            }}
          >
            {anatomySystems.map((entry) => {
              const Icon = icons[entry.id];
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={entry.name[language]}
                  aria-pressed={system === entry.id}
                  onPress={() => changeSystem(entry.id)}
                  style={{
                    flex: compact ? 1 : undefined,
                    alignItems: "center",
                    paddingVertical: 13,
                    paddingHorizontal: 3,
                    borderRadius: 12,
                    gap: 7,
                    backgroundColor:
                      system === entry.id ? "#4a315a" : "transparent",
                    minWidth: 52,
                  }}
                >
                  <Icon
                    size={20}
                    color={system === entry.id ? "#d4f4aa" : "#a58daf"}
                  />
                  <Txt
                    style={{
                      fontSize: 10,
                      color: system === entry.id ? "#e1f8bd" : "#ad98bb",
                    }}
                  >
                    {entry.name[language]}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              padding: compact ? 10 : 16,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Txt style={{ color: "#b9a4ca", fontSize: 10, letterSpacing: 1 }}>
                {palette.name[language].toUpperCase()} ·{" "}
                {mode === "3d"
                  ? l("MAILLAGES ANATOMIQUES", "ANATOMICAL MESHES")
                  : l("VUE SCHÉMATIQUE 2D", "2D SCHEMATIC VIEW")}
              </Txt>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["anterior", "posterior"] as const).map((entry) => (
                  <Pressable
                    key={entry}
                    accessibilityRole="button"
                    accessibilityLabel={
                      entry === "anterior"
                        ? l("Face", "Front")
                        : l("Dos", "Back")
                    }
                    aria-pressed={view === entry}
                    onPress={() => changeView(entry)}
                    style={{
                      padding: 9,
                      minHeight: 40,
                      borderRadius: 8,
                      backgroundColor: view === entry ? "#4d385e" : "#2d2238",
                    }}
                  >
                    <Txt style={{ color: "#eee3f6", fontSize: 11 }}>
                      {entry === "anterior"
                        ? l("Face", "Front")
                        : l("Dos", "Back")}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            </View>
            {mode === "3d" && (
              <View style={[wrap, { gap: 6 }]}>
                {regions.map((region) => (
                  <Pressable
                    key={region.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      l("Explorer la région : ", "Explore region: ") +
                      region.name[language]
                    }
                    aria-pressed={activeRegion === region.id}
                    onPress={() => {
                      setActiveRegion(region.id);
                      setRegionBounds(region.bounds);
                      setRegionKey((value) => value + 1);
                      setDetailMode(false);
                      setIsolate(false);
                      revealStage();
                    }}
                    style={{
                      minHeight: 35,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor:
                        activeRegion === region.id ? "#54416c" : "#2b2135",
                      borderWidth: 1,
                      borderColor: "#59416b",
                    }}
                  >
                    <Txt style={{ color: "#e0d0ef", fontSize: 10 }}>
                      {region.name[language]}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            )}
            <View
              ref={stage}
              style={{
                borderRadius: 17,
                overflow: "hidden",
                backgroundColor: mode === "3d" ? "#15101e" : "#f4f7f3",
                minHeight: stageHeight,
              }}
            >
              {mode === "3d" ? (
                <AnatomyScene
                  key={sourceId}
                  sourceManifest={anatomyModelManifest}
                  appearance={appearance}
                  system={system}
                  visibleSystems={visibleSystems}
                  view={view}
                  selectedId={selectedId}
                  onSelect={(id) => select(id, true)}
                  zoom={zoom}
                  height={stageHeight}
                  isolate={isolate}
                  isolatedDetail={detailMode}
                  opacity={opacity}
                  hiddenIds={hiddenIds}
                  resetKey={reset}
                  focusSelectionKey={focusKey}
                  focusRegionBounds={regionBounds}
                  focusRegionKey={regionKey}
                  language={language}
                />
              ) : (
                <HumanFigure
                  system={system}
                  view={view}
                  selectedId={
                    selected.views.includes(view) ? selected.id : undefined
                  }
                  onSelect={(id) => select(id)}
                  zoom={zoom}
                  height={stageHeight}
                  language={language}
                />
              )}
            </View>
            {mode === "3d" && (
              <View style={{ gap: 9 }}>
                <View style={[wrap, { gap: 7 }]}>
                  {tool(
                    l("Centrer la structure", "Focus structure"),
                    Focus,
                    () => {
                      setFocusKey((value) => value + 1);
                      setActiveRegion(undefined);
                      setRegionBounds(undefined);
                      revealStage();
                    },
                    false,
                    !selected.meshIds.length,
                  )}
                  {tool(
                    l("Isoler", "Isolate"),
                    Layers3,
                    () => setIsolate((value) => !value),
                    isolate || detailMode,
                    !selected.meshIds.length || detailMode,
                  )}
                  {sourceId === "extended" &&
                    tool(
                      detailMode
                        ? l("Revenir au corps", "Back to body")
                        : l("Détail HD", "HD detail"),
                      Sparkles,
                      () => {
                        setDetailMode((value) => !value);
                        setIsolate(false);
                        setHiddenIds((current) =>
                          current.filter(
                            (id) => !selected.meshIds.includes(id),
                          ),
                        );
                        revealStage();
                      },
                      detailMode,
                      !detailAvailable,
                    )}
                  {tool(
                    hidden
                      ? l("Afficher la structure", "Show structure")
                      : l("Masquer la structure", "Hide structure"),
                    hidden ? Eye : EyeOff,
                    toggleHidden,
                    hidden,
                    !selected.meshIds.length || detailMode,
                  )}
                  {tool(
                    l("Transparence", "Transparency"),
                    Eye,
                    () =>
                      setOpacity((value) =>
                        value === 1 ? 0.35 : value === 0.35 ? 0.15 : 1,
                      ),
                    opacity !== 1,
                    detailMode,
                  )}
                </View>
                {!detailMode && !detailAvailable && detailMeshIds.size > 0 && (
                  <Txt style={{ color: "#aa94ba", fontSize: 10 }}>
                    {l(
                      "Pour une inspection plus fine, sélectionnez un élément marqué HD dans la liste.",
                      "For a closer inspection, select an item marked HD in the list.",
                    )}
                  </Txt>
                )}
                {detailMode && (
                  <Txt style={{ color: "#ccb7e1", fontSize: 11 }}>
                    {l(
                      "Vue de détail isolée : référence BodyParts3D 3.0, plus dense. Ce modèle distinct sert à étudier la forme ; revenez au corps pour explorer les rapports.",
                      "Isolated detail: denser BodyParts3D 3.0 reference. This separate model shows shape; return to the body to explore relationships.",
                    )}
                  </Txt>
                )}
                {!detailMode && (
                  <View style={[wrap, { gap: 6, alignItems: "center" }]}>
                    <Txt style={{ color: "#aa94ba", fontSize: 10 }}>
                      {l("SUPERPOSER", "LAYERS")}
                    </Txt>
                    {anatomySystems.map((entry) => (
                      <Pressable
                        key={entry.id}
                        accessibilityRole="checkbox"
                        accessibilityLabel={
                          l("Superposer · ", "Overlay · ") +
                          entry.name[language]
                        }
                        accessibilityState={{
                          checked: visibleSystems.includes(entry.id),
                          disabled: entry.id === system,
                        }}
                        disabled={entry.id === system}
                        onPress={() =>
                          setOverlays((current) =>
                            current.includes(entry.id)
                              ? current.filter((id) => id !== entry.id)
                              : [...current, entry.id],
                          )
                        }
                        style={{
                          paddingHorizontal: 9,
                          paddingVertical: 8,
                          minHeight: 36,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: visibleSystems.includes(entry.id)
                            ? "#81724e"
                            : "#44364e",
                          backgroundColor: visibleSystems.includes(entry.id)
                            ? "#3f3528"
                            : "#261c30",
                        }}
                      >
                        <Txt
                          style={{
                            fontSize: 10,
                            color: visibleSystems.includes(entry.id)
                              ? "#e8d3a1"
                              : "#ab94bd",
                          }}
                        >
                          {visibleSystems.includes(entry.id) ? "✓ " : "+ "}
                          {entry.name[language]}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={[wrap, { gap: 7 }]}>
              {tool(
                l("Attaches", "Attachments"),
                Activity,
                () => setInspector("attachments"),
                inspector === "attachments",
              )}
              {tool(
                l("Agrandir la scène", "Expand scene"),
                Maximize2,
                () => setExpanded((value) => !value),
                expanded,
              )}
              {tool(
                l("Revoir le corps entier", "Show the whole body"),
                RotateCcw,
                restore,
              )}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 9,
                justifyContent: "center",
              }}
            >
              {tool(l("Dézoomer le corps", "Zoom out of body"), Minus, () =>
                setZoom((value) => Math.max(1, value - 0.5)),
              )}
              <Txt style={{ color: "#c8b6d5", fontSize: 11 }}>
                ×{zoom.toFixed(1)}
              </Txt>
              {tool(
                l("Zoomer sur la structure", "Zoom into structure"),
                Plus,
                () => setZoom((value) => Math.min(3.5, value + 0.5)),
              )}
            </View>
          </View>
          <AnatomyInspector
            atlas={atlas}
            onPractice={onPractice}
            compact={compact}
          />
        </View>
        <AnatomyStructureSearch atlas={atlas} />
      </View>
    </View>
  );
}
