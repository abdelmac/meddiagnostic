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
  anatomyModelManifest,
  anatomyModelMeshes,
  anatomySearchKey,
  atlasLandmarks,
  atlasMeshStructures,
  atlasQuizStructureId,
  atlasStructure,
} from "../data/anatomy-catalog";
import { muscleAttachments } from "../data/muscle-attachments";
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
const detailMeshIds = new Set(
  (
    anatomyModelManifest as unknown as {
      isolatedDetails?: { entries: { id: string }[] };
    }
  ).isolatedDetails?.entries.map((entry) => entry.id) ?? [],
);
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
  const { language } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 1100;
  const l = (fr: string, en: string) => (language === "fr" ? fr : en);
  const initial =
    atlasStructure(initialStructureId ?? "deltoid") ??
    atlasStructure("deltoid")!;
  const [system, setSystem] = useState<AnatomySystem>(initial.system);
  const [view, setView] = useState<AnatomyView>(initial.views[0]!);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [mode, setMode] = useState<"3d" | "2d">(
    Platform.OS === "web" ? "3d" : "2d",
  );
  const [overlays, setOverlays] = useState<AnatomySystem[]>(["skeleton"]);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [resultLimit, setResultLimit] = useState(48);
  const [isolate, setIsolate] = useState(false);
  const [detailMode, setDetailMode] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [inspector, setInspector] = useState<
    "overview" | "attachments" | "quiz"
  >("overview");
  const [reset, setReset] = useState(0);
  const [focusKey, setFocusKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const stage = useRef<React.ComponentRef<typeof View>>(null);
  const revealStage = () => {
    if (Platform.OS !== "web") return;
    const node = stage.current as unknown as HTMLElement | null;
    node?.scrollIntoView?.({ block: "center", behavior: "instant" });
  };
  const selected = atlasStructure(selectedId) ?? initial;
  const palette = anatomySystem(system);
  const muscle = selected.legacyId
    ? muscleAttachments[selected.legacyId]
    : undefined;
  const quizId = atlasQuizStructureId(selected.id);
  const detailAvailable =
    selected.meshIds.length > 0 &&
    selected.meshIds.every((id) => detailMeshIds.has(id));
  const visibleSystems = useMemo(
    () => [...new Set([...overlays, system])],
    [overlays, system],
  );
  const hidden =
    selected.meshIds.length > 0 &&
    selected.meshIds.every((id) => hiddenIds.includes(id));
  const query = anatomySearchKey(search.trim());
  const landmarks = useMemo(
    () =>
      atlasLandmarks.filter((item) =>
        query
          ? anatomySearchKey(
              item.name.fr + " " + item.name.en + " " + item.region[language],
            ).includes(query)
          : item.system === system &&
            (mode === "3d" || item.views.includes(view)),
      ),
    [query, system, view, mode, language],
  );
  const results = useMemo(
    () =>
      mode === "2d"
        ? []
        : atlasMeshStructures.filter((item) =>
            query
              ? anatomySearchKey(
                  item.name.fr +
                    " " +
                    item.name.en +
                    " " +
                    item.id +
                    " " +
                    item.fmaId,
                ).includes(query)
              : item.system === system,
          ),
    [query, system, mode],
  );

  const select = (id: string, fromModel = false) => {
    const next = atlasStructure(id);
    if (!next) return;
    setDetailMode(
      (current) =>
        current &&
        next.meshIds.length > 0 &&
        next.meshIds.every((meshId) => detailMeshIds.has(meshId)),
    );
    if (fromModel && next.system !== system)
      setOverlays((current) => [...new Set([...current, system])]);
    setSelectedId(next.id);
    setSystem(next.system);
    setSourceError(false);
    if (mode === "2d")
      setView((current) =>
        next.views.includes(current) ? current : next.views[0]!,
      );
    if (!fromModel)
      setHiddenIds((current) =>
        current.filter((hiddenId) => !next.meshIds.includes(hiddenId)),
      );
  };
  useEffect(() => {
    if (initialStructureId) select(initialStructureId);
  }, [initialStructureId]);
  useEffect(() => {
    setResultLimit(48);
  }, [query, system]);
  const changeSystem = (nextSystem: AnatomySystem) => {
    setDetailMode(false);
    setSearch("");
    setIsolate(false);
    setOpacity(1);
    const next =
      atlasLandmarks.find(
        (item) => item.system === nextSystem && item.views.includes(view),
      ) ?? atlasLandmarks.find((item) => item.system === nextSystem)!;
    select(next.id);
  };
  const changeMode = (next: "3d" | "2d") => {
    setMode(next);
    setDetailMode(false);
    if (next === "2d" && !selected.landmark) {
      const landmark =
        atlasStructure(selected.legacyId) ??
        atlasLandmarks.find((item) => item.system === system)!;
      setSelectedId(landmark.id);
      setView(landmark.views[0]!);
    }
  };
  const changeView = (next: AnatomyView) => {
    setView(next);
    setReset((value) => value + 1);
    if (mode === "2d" && !selected.views.includes(next)) {
      const item = atlasLandmarks.find(
        (entry) => entry.system === system && entry.views.includes(next),
      );
      if (item) setSelectedId(item.id);
    }
  };
  const toggleHidden = () =>
    setHiddenIds((current) =>
      hidden
        ? current.filter((id) => !selected.meshIds.includes(id))
        : [...new Set([...current, ...selected.meshIds])],
    );
  const restore = () => {
    setDetailMode(false);
    setHiddenIds([]);
    setIsolate(false);
    setOpacity(1);
    setZoom(1);
    setReset((value) => value + 1);
  };
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
        {mode === "3d" &&
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
                  {tool(
                    detailMode
                      ? l("Revenir au corps", "Back to body")
                      : l("Détail HD", "HD detail"),
                    Sparkles,
                    () => {
                      setDetailMode((value) => !value);
                      setIsolate(false);
                      setHiddenIds((current) =>
                        current.filter((id) => !selected.meshIds.includes(id)),
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
          <View
            testID="anatomy-selected-structure"
            style={{
              width: compact ? "100%" : 285,
              padding: 21,
              borderLeftWidth: compact ? 0 : 1,
              borderTopWidth: compact ? 1 : 0,
              borderColor: "#392c43",
              backgroundColor: "#21172b",
              gap: 15,
            }}
          >
            <Txt style={{ color: "#af99bf", fontSize: 10, letterSpacing: 1 }}>
              {selected.region[language].toUpperCase()}
            </Txt>
            <Title style={{ color: "#fff", fontSize: 24, lineHeight: 31 }}>
              {selected.name[language]}
            </Title>
            {!!selected.fmaId && (
              <Txt style={{ color: "#a18aae", fontSize: 10 }}>
                {selected.fmaId} · {selected.id.split("_").at(-1)}
              </Txt>
            )}
            {language === "fr" && !selected.translated && (
              <Txt style={{ color: "#c4b0d3", fontSize: 11 }}>
                {l(
                  "Nom de la source en anglais ; traduction spécialisée à compléter.",
                  "Original English source term.",
                )}
              </Txt>
            )}
            {mode === "3d" && !selected.meshIds.length && (
              <View
                style={{
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: "#3c2c27",
                  gap: 8,
                }}
              >
                <Txt style={{ color: "#f0cf9b", fontSize: 11 }}>
                  {l(
                    "Ce repère n’a pas de maillage 3D dans les données disponibles. Sa fiche et son schéma restent accessibles.",
                    "No 3D mesh is available for this landmark in the source dataset. Its notes and diagram remain available.",
                  )}
                </Txt>
                <Button
                  secondary
                  small
                  label={l("Voir le schéma 2D", "View 2D diagram")}
                  onPress={() => changeMode("2d")}
                />
              </View>
            )}
            {hidden && mode === "3d" && (
              <Txt style={{ color: "#e5c58c", fontSize: 11 }}>
                {l(
                  "Structure masquée. Utilisez Afficher pour la retrouver.",
                  "Structure hidden. Use Show to reveal it again.",
                )}
              </Txt>
            )}
            <View style={{ flexDirection: "row", gap: 5, flexWrap: "wrap" }}>
              {(["overview", "attachments", "quiz"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={
                    value === "overview"
                      ? l("Fiche de structure", "Structure notes")
                      : value === "attachments"
                        ? l("Origines et insertions", "Origins and insertions")
                        : l("Quiz sur cette structure", "Quiz this structure")
                  }
                  aria-pressed={inspector === value}
                  onPress={() => setInspector(value)}
                  style={{
                    paddingVertical: 9,
                    minHeight: 40,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor:
                      inspector === value ? "#513968" : "#30223c",
                  }}
                >
                  <Txt
                    style={{
                      color: inspector === value ? "#d7f7a7" : "#c9b7d6",
                      fontSize: 11,
                    }}
                  >
                    {value === "overview"
                      ? l("Fiche", "Notes")
                      : value === "attachments"
                        ? l("Attaches", "Attachments")
                        : "Quiz"}
                  </Txt>
                </Pressable>
              ))}
            </View>
            {inspector === "overview" && (
              <>
                <Txt style={{ color: "#e3d5ec", fontSize: 13 }}>
                  {selected.summary[language]}
                </Txt>
                {selected.legacyId && !selected.landmark && (
                  <Txt style={{ color: "#b7a1c9", fontSize: 11 }}>
                    {l("Fiche du groupe : ", "Group notes: ")}
                    {atlasStructure(selected.legacyId)?.name[language]}
                  </Txt>
                )}
                {muscle && (
                  <Txt style={{ color: "#b7a1c9", fontSize: 12 }}>
                    {l(
                      "Origines, insertions, action et innervation dans l’onglet Attaches.",
                      "Origins, insertions, actions and innervation are under Attachments.",
                    )}
                  </Txt>
                )}
              </>
            )}
            {inspector === "attachments" &&
              (muscle ? (
                <View style={{ gap: 16 }}>
                  {(
                    Object.keys(focusLabels) as (keyof typeof focusLabels)[]
                  ).map((focus) => (
                    <View key={focus} style={{ gap: 5 }}>
                      <Txt
                        style={{
                          color:
                            focus === "origin"
                              ? "#91d6ff"
                              : focus === "insertion"
                                ? "#f3cc8c"
                                : "#ceb7df",
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {focusLabels[focus][language].toUpperCase()}
                      </Txt>
                      <Txt style={{ color: "#e4d7ec", fontSize: 12 }}>
                        {muscle[focus][language]}
                      </Txt>
                    </View>
                  ))}
                  <Txt style={{ color: "#a98fbb", fontSize: 10 }}>
                    {l(
                      "Les attaches sont décrites dans les fiches ; aucun point d’insertion approximatif n’est ajouté au modèle.",
                      "Attachments are described in the notes; no approximate insertion points are added to the model.",
                    )}
                  </Txt>
                </View>
              ) : (
                <Txt style={{ color: "#cdbbd9", fontSize: 12 }}>
                  {l(
                    "Les fiches d’attaches sont disponibles pour les sept groupes musculaires étudiés dans les quiz.",
                    "Attachment notes are available for the seven muscle groups covered by the quizzes.",
                  )}
                </Txt>
              ))}
            {inspector === "quiz" && (
              <View style={{ gap: 10 }}>
                {quizId ? (
                  <>
                    <Txt style={{ color: "#cdbbd9", fontSize: 12 }}>
                      {l("Rappel actif · ", "Active recall · ")}
                      {atlasStructure(quizId)?.name[language]}
                    </Txt>
                    {muscle &&
                      (
                        Object.keys(focusLabels) as (keyof typeof focusLabels)[]
                      ).map((focus) => (
                        <Button
                          key={focus}
                          small
                          label={"Quiz · " + focusLabels[focus][language]}
                          onPress={() => onPractice?.(focus, quizId)}
                          disabled={!onPractice}
                        />
                      ))}
                    <Button
                      small
                      secondary
                      label={l(
                        "Toutes les questions de cette structure",
                        "All questions for this structure",
                      )}
                      onPress={() => onPractice?.(undefined, quizId)}
                      disabled={!onPractice}
                    />
                  </>
                ) : (
                  <Txt style={{ color: "#cdbbd9", fontSize: 12 }}>
                    {l(
                      "Les quiz de cette structure détaillée ne sont pas encore disponibles. Retrouvez les questions dans les repères du cours.",
                      "Quizzes for this detailed structure are not yet available. Choose a course landmark to find related questions.",
                    )}
                  </Txt>
                )}
              </View>
            )}
            <View style={{ height: 1, backgroundColor: "#412e4b" }} />
            {(
              muscle?.sources ??
              selected.sources.map((url) => ({
                title: l("Référence anatomique", "Anatomy reference"),
                url,
              }))
            )
              .slice(0, 2)
              .map((source, index) => (
                <Pressable
                  key={source.url + index}
                  accessibilityRole="link"
                  onPress={() => {
                    setSourceError(false);
                    void Linking.openURL(source.url).catch(() =>
                      setSourceError(true),
                    );
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    minHeight: 40,
                  }}
                >
                  <Txt style={{ color: "#c6a5ee", fontSize: 11, flex: 1 }}>
                    {source.title}
                  </Txt>
                  <ArrowUpRight size={13} color="#c6a5ee" />
                </Pressable>
              ))}
            {sourceError && (
              <Txt style={{ color: "#ffc7c7", fontSize: 11 }}>
                {l(
                  "Le lien n’a pas pu s’ouvrir.",
                  "The link could not be opened.",
                )}
              </Txt>
            )}
            <Txt style={{ color: "#a48db4", fontSize: 10 }}>
              {l(
                "Atlas de référence pour l’apprentissage. Fiches et quiz en attente de relecture médicale.",
                "Reference atlas for learning. Notes and quizzes await medical review.",
              )}
            </Txt>
            <Button
              label={l("S’entraîner en anatomie", "Practise anatomy")}
              small
              icon={Sparkles}
              onPress={() => onPractice?.()}
              disabled={!onPractice}
            />
          </View>
        </View>
        <View
          style={{
            padding: 17,
            borderTopWidth: 1,
            borderColor: "#392c43",
            gap: 15,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#4e3c59",
              borderRadius: 11,
              paddingHorizontal: 12,
              backgroundColor: "#261a30",
              gap: 9,
            }}
          >
            <Search size={16} color="#b49dc6" />
            <TextInput
              accessibilityLabel={l(
                "Rechercher une structure anatomique",
                "Search for an anatomical structure",
              )}
              placeholder={l(
                "Muscle, nerf, os, organe ou identifiant FMA…",
                "Muscle, nerve, bone, organ or FMA identifier…",
              )}
              placeholderTextColor="#a38bb4"
              value={search}
              onChangeText={setSearch}
              style={{
                color: "#eee4f7",
                minHeight: 48,
                flex: 1,
                minWidth: 0,
                fontSize: 14,
              }}
              autoCorrect={false}
            />
          </View>
          {landmarks.length > 0 && (
            <View style={{ gap: 9 }}>
              <Txt
                style={{ color: "#bfa6d0", fontSize: 11, fontWeight: "600" }}
              >
                {l(
                  "REPÈRES DU COURS · FICHES ET QUIZ",
                  "COURSE LANDMARKS · NOTES AND QUIZZES",
                )}
              </Txt>
              <View style={[wrap, { gap: 7 }]}>
                {landmarks.map((item) => structureButton(item, true))}
              </View>
            </View>
          )}
          {mode === "3d" && (
            <View style={{ gap: 9 }}>
              <Txt
                style={{ color: "#bfa6d0", fontSize: 11, fontWeight: "600" }}
              >
                {l("STRUCTURES DÉTAILLÉES", "DETAILED STRUCTURES")} ·{" "}
                {results.length}
              </Txt>
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight: 245 }}
                contentContainerStyle={{ paddingBottom: 6 }}
              >
                <View style={[wrap, { gap: 7 }]}>
                  {results
                    .slice(0, resultLimit)
                    .map((item) => structureButton(item))}
                </View>
              </ScrollView>
              {results.length > resultLimit && (
                <Button
                  secondary
                  small
                  label={l(
                    "Afficher davantage de structures",
                    "Show more structures",
                  )}
                  onPress={() => setResultLimit((current) => current + 60)}
                />
              )}
            </View>
          )}
          {!landmarks.length && !results.length && (
            <Txt style={{ color: "#c1aace", fontSize: 12 }}>
              {l("Aucune structure trouvée.", "No structure found.")}
            </Txt>
          )}
          <View
            style={{
              borderTopWidth: 1,
              borderColor: "#392c43",
              paddingTop: 13,
              gap: 6,
            }}
          >
            <Txt style={{ color: "#a88fb9", fontSize: 10 }}>
              {l(
                "Maillages : BodyParts3D · Database Center for Life Science (DBCLS). Adaptation et compression pour Ippomed.",
                "Meshes: BodyParts3D · Database Center for Life Science (DBCLS). Adapted and compressed for Ippomed.",
              )}
            </Txt>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={l(
                "Sources et licences du modèle 3D",
                "3D model sources and licences",
              )}
              onPress={() =>
                void Linking.openURL(
                  Platform.OS === "web"
                    ? "/anatomy/bodyparts3d/ATTRIBUTION.txt"
                    : "https://medquiz-europe.medcompass-web.workers.dev/anatomy/bodyparts3d/ATTRIBUTION.txt",
                ).catch(() => setSourceError(true))
              }
              style={{ minHeight: 35, justifyContent: "center" }}
            >
              <Txt
                style={{
                  fontSize: 11,
                  color: "#c4a6e4",
                  textDecorationLine: "underline",
                }}
              >
                {l(
                  "Sources, licences et adaptations",
                  "Sources, licences and adaptations",
                )}{" "}
                ↗
              </Txt>
            </Pressable>
            <Txt style={{ color: "#8e789f", fontSize: 10 }}>
              {anatomyModelManifest.dataset}
            </Txt>
          </View>
        </View>
      </View>
    </View>
  );
}
