import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFocusEffect } from "expo-router";
import {
  BackHandler,
  Image,
  Platform,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewProps,
} from "react-native";
import {
  Activity,
  ArrowLeft,
  Bone,
  BookOpen,
  ChevronDown,
  ChevronRight,
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
  Scissors,
  Sun,
  Undo2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { anatomySystems } from "../data/anatomy-structures";
import { anatomyQuickViews } from "../data/anatomy-catalog";
import type { AnatomyFocus } from "../domain/types";
import { useI18n } from "../i18n";
import { AnatomyInspector, AnatomyStructureSearch } from "./anatomy-panels";
import { AnatomyScene } from "./AnatomyScene";
import { HumanFigure } from "./anatomy-vector";
import { useAnatomyAtlas } from "./useAnatomyAtlas";
import { Txt } from "./components";

type Panel = "search" | "layers" | "notes" | null;
const systemIcons = {
  muscles: Activity,
  skeleton: Bone,
  nerves: Zap,
  organs: Heart,
  vessels: Network,
};

/** Native touch, assistive actions and web keyboard all edit the same plane. */
function SectionPositionControl({
  value,
  onChange,
  label,
  decreaseLabel,
  increaseLabel,
  onDragChange,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  onDragChange: (dragging: boolean) => void;
}) {
  const trackWidth = useRef(1);
  const trackPageOrigin = useRef(0);
  const current = useRef({ value, onChange, onDragChange });
  current.current = { value, onChange, onDragChange };
  useEffect(() => () => current.current.onDragChange(false), []);
  const setPosition = (next: number) => {
    if (Number.isFinite(next))
      current.current.onChange(Math.max(0, Math.min(1, next)));
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > Math.abs(gesture.dy) &&
          Math.abs(gesture.dx) > 3,
        onPanResponderGrant: (event) => {
          current.current.onDragChange(true);
          const { pageX, locationX } = event.nativeEvent;
          trackPageOrigin.current = pageX - locationX;
          setPosition((pageX - trackPageOrigin.current) / trackWidth.current);
        },
        onPanResponderMove: (event) =>
          setPosition(
            (event.nativeEvent.pageX - trackPageOrigin.current) /
              trackWidth.current,
          ),
        onPanResponderRelease: (event) => {
          setPosition(
            (event.nativeEvent.pageX - trackPageOrigin.current) /
              trackWidth.current,
          );
          current.current.onDragChange(false);
        },
        onPanResponderTerminate: () => current.current.onDragChange(false),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [],
  );
  const changeBy = (step: number) => setPosition(current.current.value + step);
  const handleKeyDown: NonNullable<ViewProps["onKeyDown"]> = (event) => {
    const key = event.nativeEvent.key;
    const direction =
      key === "ArrowLeft" || key === "ArrowDown"
        ? -1
        : key === "ArrowRight" || key === "ArrowUp"
          ? 1
          : 0;
    if (direction) {
      event.preventDefault();
      changeBy(direction * 0.005);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      setPosition(key === "Home" ? 0 : 1);
    }
  };
  const percentage = Math.round(value * 1000) / 10;
  // RN Web reads the explicit ARIA fields, while native uses accessibilityValue.
  const webAccessibilityValue =
    Platform.OS === "web"
      ? {
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuenow": percentage,
          "aria-valuetext": `${percentage}%`,
        }
      : {};
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Txt style={{ color: "#c9c0d4", fontSize: 11, flex: 1 }}>{label}</Txt>
        <Txt style={{ color: "#d5e9b2", fontSize: 12 }}>{percentage}%</Txt>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Action
          label={decreaseLabel}
          Icon={Minus}
          iconOnly
          disabled={value <= 0}
          onPress={() => changeBy(-0.005)}
        />
        <View
          {...responder.panHandlers}
          onKeyDown={handleKeyDown}
          testID="anatomy-section-slider"
          accessible
          focusable
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          {...webAccessibilityValue}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: percentage,
            text: `${percentage}%`,
          }}
          accessibilityActions={[
            { name: "increment", label: increaseLabel },
            { name: "decrement", label: decreaseLabel },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") changeBy(0.005);
            else if (event.nativeEvent.actionName === "decrement")
              changeBy(-0.005);
          }}
          onLayout={(event) => {
            trackWidth.current = Math.max(1, event.nativeEvent.layout.width);
          }}
          style={{
            flex: 1,
            minWidth: 60,
            height: 48,
            marginHorizontal: 10,
            justifyContent: "center",
          }}
        >
          <View
            pointerEvents="none"
            style={{ height: 4, borderRadius: 2, backgroundColor: "#494354" }}
          >
            <View
              style={{
                width: `${value * 100}%`,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#b8d993",
              }}
            />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: `${value * 100}%`,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#d5efad",
              borderWidth: 2,
              borderColor: "#819b62",
              transform: [{ translateX: -9 }],
            }}
          />
        </View>
        <Action
          label={increaseLabel}
          Icon={Plus}
          iconOnly
          disabled={value >= 1}
          onPress={() => changeBy(0.005)}
        />
      </View>
    </View>
  );
}

function Action({
  label,
  Icon,
  onPress,
  active = false,
  disabled = false,
  iconOnly = false,
  stacked = false,
}: {
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  stacked?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      aria-pressed={active}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        stacked && {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 3,
          paddingVertical: 4,
          flexDirection: "column",
          gap: 3,
          borderWidth: 0,
        },
        active && styles.active,
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Icon size={19} color={active ? "#d0f28d" : "#d7d4e1"} />
      {!iconOnly && (
        <Txt
          style={{
            color: active ? "#d0f28d" : "#d7d4e1",
            fontSize: 11,
            lineHeight: 15,
          }}
          numberOfLines={1}
        >
          {label}
        </Txt>
      )}
    </Pressable>
  );
}

/** One viewport: the model owns the space; secondary work scrolls inside panels. */
export function AnatomyStudyWorkspace({
  initialStructureId,
  focusRequest,
  onExit,
  onCourse,
  onPractice,
}: {
  initialStructureId?: string;
  focusRequest?: string;
  onExit: () => void;
  onCourse: () => void;
  onPractice: (focus?: AnatomyFocus, structureId?: string) => void;
}) {
  const atlas = useAnatomyAtlas({ initialStructureId, focusRequest });
  const { l, language, selected, system, sourceId, mode, view } = atlas;
  const { setLanguage } = useI18n();
  const { width, height } = useWindowDimensions();
  const shortScreen = height < 500;
  const beside = width >= 1000 || (width >= 680 && height < 550);
  const [panel, setPanel] = useState<Panel>(width >= 1000 ? "notes" : null);
  const [sectionDragging, setSectionDragging] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(Math.max(200, height - 260));
  const [zen, setZen] = useState(false);
  const toggle = (next: Panel) => {
    setZen(false);
    setPanel((current) => (current === next ? null : next));
  };
  const CurrentIcon = systemIcons[system];
  const quickActions = () =>
    anatomyQuickViews.map((entry) => (
      <Action
        key={entry.id}
        label={entry.name[language]}
        Icon={systemIcons[entry.system]}
        active={atlas.quickView === entry.id}
        disabled={atlas.quickViewCounts[entry.id] === 0}
        onPress={() => {
          atlas.showQuickView(entry.id);
          if (!beside) setPanel(null);
        }}
      />
    ));
  const focusSelection = () => {
    atlas.setFocusKey((n) => n + 1);
    atlas.setActiveRegion(undefined);
    atlas.setRegionBounds(undefined);
  };
  const toggleDetail = () => {
    atlas.setSection(undefined);
    atlas.setDetailMode((value) => !value);
    atlas.setIsolate(false);
    atlas.setHiddenIds((current) =>
      current.filter((id) => !selected.meshIds.includes(id)),
    );
    setPanel(null);
  };
  const panelTitle =
    panel === "search"
      ? l("Trouver une structure", "Find a structure")
      : panel === "layers"
        ? l("Corps et couches", "Body and layers")
        : l("Étudier la structure", "Study this structure");
  useFocusEffect(
    useCallback(() => {
      if (!panel) return;
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          setPanel(null);
          return true;
        },
      );
      const key = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setPanel(null);
          event.preventDefault();
        }
      };
      if (Platform.OS === "web") window.addEventListener("keydown", key);
      return () => {
        subscription.remove();
        if (Platform.OS === "web") window.removeEventListener("keydown", key);
      };
    }, [panel]),
  );
  const studyPanel =
    panel && !zen ? (
      <View
        testID="anatomy-study-panel"
        style={[
          styles.panel,
          beside
            ? { width: width < 1000 ? 280 : 340, borderLeftWidth: 1 }
            : {
                height: Math.min(350, Math.max(190, height * 0.37)),
                borderTopWidth: 1,
              },
        ]}
      >
        <View style={styles.panelHeader}>
          <Txt
            style={{
              color: "#f2edf9",
              fontSize: 14,
              fontWeight: "600",
              flex: 1,
            }}
          >
            {panelTitle}
          </Txt>
          <Action
            label={l("Fermer le panneau", "Close panel")}
            Icon={beside ? X : ChevronDown}
            iconOnly
            onPress={() => setPanel(null)}
          />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEnabled={!sectionDragging}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {panel === "notes" && (
            <AnatomyInspector atlas={atlas} onPractice={onPractice} />
          )}
          {panel === "search" && <AnatomyStructureSearch atlas={atlas} />}
          {panel === "layers" && (
            <View style={{ padding: 16, gap: 20 }}>
              {shortScreen && (
                <View style={{ gap: 8 }} testID="anatomy-quick-views">
                  <Txt style={styles.eyebrow}>
                    {l("VUES RAPIDES", "QUICK VIEWS")}
                  </Txt>
                  <View style={styles.wrap}>{quickActions()}</View>
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Txt style={styles.eyebrow}>
                  {l("EXPLORER UN SYSTÈME", "EXPLORE A SYSTEM")}
                </Txt>
                <View style={styles.wrap}>
                  {anatomySystems.map((entry) => (
                    <Action
                      key={entry.id}
                      label={entry.name[language]}
                      Icon={systemIcons[entry.id]}
                      active={system === entry.id}
                      disabled={!atlas.systemAvailable(entry.id)}
                      onPress={() => atlas.changeSystem(entry.id)}
                    />
                  ))}
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Txt style={styles.eyebrow}>
                  {l("SUPERPOSER LES COUCHES", "OVERLAY LAYERS")}
                </Txt>
                {anatomySystems.map((entry) => (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={
                      l("Superposer ", "Overlay ") + entry.name[language]
                    }
                    aria-pressed={atlas.visibleSystems.includes(entry.id)}
                    disabled={entry.id === system || !atlas.systemAvailable(entry.id)}
                    onPress={() =>
                      atlas.setOverlays((current) =>
                        current.includes(entry.id)
                          ? current.filter((id) => id !== entry.id)
                          : [...current, entry.id],
                      )
                    }
                    style={styles.layer}
                  >
                    <Txt style={{ color: "#ece6f4", flex: 1 }}>
                      {entry.name[language]}
                    </Txt>
                    <Txt
                      style={{
                        color: atlas.visibleSystems.includes(entry.id)
                          ? "#c7ee86"
                          : "#817d91",
                        fontSize: 17,
                      }}
                    >
                      {atlas.visibleSystems.includes(entry.id) ? "✓" : "+"}
                    </Txt>
                  </Pressable>
                ))}
                {atlas.quickView === "nerves" && (
                  <Txt style={{ color: "#a9a5b8", fontSize: 11 }}>
                    {l(
                      "Les nerfs sont affichés seuls. Ajoutez le squelette ici pour étudier leurs rapports avec les os.",
                      "Nerves are shown on their own. Add the skeleton here to study their relationships with bones.",
                    )}
                  </Txt>
                )}
              </View>
              {atlas.sourceInfo.networks && mode === "3d" && (
                <View style={{ gap: 8 }}>
                  <Txt style={styles.eyebrow}>
                    {l("ARTÈRES ET VEINES", "ARTERIES AND VEINS")}
                  </Txt>
                  <View style={styles.wrap}>
                    {(["all", "artery", "vein"] as const).map((value) => (
                      <Action
                        key={value}
                        label={
                          value === "all"
                            ? l("Tous les vaisseaux", "All vessels")
                            : value === "artery"
                              ? l("Artères uniquement", "Arteries only")
                              : l("Veines uniquement", "Veins only")
                        }
                        Icon={Network}
                        active={
                          system === "vessels" && atlas.vascularFilter === value
                        }
                        onPress={() => atlas.changeVascularFilter(value)}
                      />
                    ))}
                  </View>
                  <Txt style={{ color: "#a9a5b8", fontSize: 11 }}>
                    {l("Modèles d’artères", "Artery models")} :{" "}
                    {atlas.currentViewCounts.arteries}
                    {" · "}
                    {l("Modèles de veines", "Vein models")} :{" "}
                    {atlas.currentViewCounts.veins}
                    {" · "}
                    {l("Modèles nerveux", "Nervous models")} :{" "}
                    {atlas.currentViewCounts.nerves}
                  </Txt>
                  {atlas.quickView === "bones" && (
                    <Txt style={{ color: "#a9a5b8", fontSize: 11 }}>
                      {l(
                        "Les formes osseuses sont présentées avec les cartilages et les articulations de la référence.",
                        "Bone shapes are shown with the reference cartilage and joints.",
                      )}
                    </Txt>
                  )}
                </View>
              )}
              <View style={{ gap: 10 }}>
                <Txt style={styles.eyebrow}>
                  {l("COUPE ET DISSECTION", "SECTION AND DISSECTION")}
                </Txt>
                <Action
                  label={l("Coupe anatomique", "Anatomical section")}
                  Icon={Scissors}
                  active={!!atlas.section}
                  disabled={mode !== "3d" || atlas.detailMode}
                  onPress={() =>
                    atlas.section
                      ? atlas.setSection(undefined)
                      : atlas.startSection()
                  }
                />
                {atlas.section && (
                  <View
                    testID="anatomy-section-controls"
                    style={{ gap: 12, paddingTop: 2 }}
                  >
                    <View style={styles.wrap}>
                      {(
                        [
                          ["axial", l("Axial", "Axial")],
                          ["sagittal", l("Sagittal", "Sagittal")],
                          ["coronal", l("Coronal", "Coronal")],
                        ] as const
                      ).map(([axis, label]) => (
                        <Action
                          key={axis}
                          label={label}
                          Icon={Scissors}
                          active={atlas.section!.axis === axis}
                          onPress={() =>
                            atlas.setSection((current) =>
                              current
                                ? {
                                    ...current,
                                    axis,
                                    position:
                                      atlas.selectionSectionPosition(axis),
                                  }
                                : current,
                            )
                          }
                        />
                      ))}
                    </View>
                    <SectionPositionControl
                      label={l(
                        "Position du plan de coupe",
                        "Section plane position",
                      )}
                      decreaseLabel={l(
                        "Reculer le plan de coupe",
                        "Decrease section position",
                      )}
                      increaseLabel={l(
                        "Avancer le plan de coupe",
                        "Increase section position",
                      )}
                      value={atlas.section.position}
                      onChange={(position) =>
                        atlas.setSection((current) =>
                          current ? { ...current, position } : current,
                        )
                      }
                      onDragChange={setSectionDragging}
                    />
                    <View style={styles.wrap}>
                      <Action
                        label={l(
                          "Passer par la sélection",
                          "Through the selection",
                        )}
                        Icon={Focus}
                        disabled={!selected.meshIds.length}
                        onPress={() =>
                          atlas.setSection((current) =>
                            current
                              ? {
                                  ...current,
                                  position: atlas.selectionSectionPosition(
                                    current.axis,
                                  ),
                                }
                              : current,
                          )
                        }
                      />
                      <Action
                        label={l("Milieu du corps", "Body midpoint")}
                        Icon={Focus}
                        onPress={() =>
                          atlas.setSection((current) =>
                            current ? { ...current, position: 0.5 } : current,
                          )
                        }
                      />
                      <Action
                        label={l("Inverser le côté", "Reverse the side")}
                        Icon={RotateCcw}
                        active={atlas.section.inverted}
                        onPress={() =>
                          atlas.setSection((current) =>
                            current
                              ? { ...current, inverted: !current.inverted }
                              : current,
                          )
                        }
                      />
                      <Action
                        label={l("Réinitialiser la coupe", "Reset section")}
                        Icon={RotateCcw}
                        onPress={() =>
                          atlas.setSection({
                            axis: "axial",
                            position: 0.5,
                            inverted: false,
                          })
                        }
                      />
                    </View>
                    <Txt style={{ color: "#a9a5b8", fontSize: 11 }}>
                      {l(
                        "Les surfaces restent ouvertes au plan de coupe.",
                        "Surfaces remain open at the section plane.",
                      )}
                    </Txt>
                  </View>
                )}
                <View style={styles.wrap}>
                  <Action
                    label={l("Annuler le dernier retrait", "Undo last removal")}
                    Icon={Undo2}
                    disabled={!atlas.hiddenHistoryCount}
                    onPress={atlas.undoHidden}
                  />
                  <Action
                    label={l("Tout réafficher", "Show all hidden structures")}
                    Icon={Eye}
                    disabled={!atlas.hiddenIds.length}
                    onPress={atlas.restoreHidden}
                  />
                </View>
                {!!atlas.hiddenIds.length && (
                  <Txt style={{ color: "#a9a5b8", fontSize: 11 }}>
                    {atlas.hiddenIds.length}{" "}
                    {l("structures retirées", "structures removed")}
                  </Txt>
                )}
              </View>
              <View style={{ gap: 8 }}>
                <Txt style={styles.eyebrow}>{l("APPARENCE", "APPEARANCE")}</Txt>
                <View style={styles.wrap}>
                  <Action
                    label={l("Rendu naturel", "Natural rendering")}
                    Icon={Sun}
                    active={atlas.appearance === "natural"}
                    onPress={() => atlas.setAppearance("natural")}
                  />
                  <Action
                    label={l("Repérage", "Study colours")}
                    Icon={Layers3}
                    active={atlas.appearance === "study"}
                    onPress={() => atlas.setAppearance("study")}
                  />
                </View>
                <Action
                  label={l("Ombres de profondeur", "Depth shading")}
                  Icon={Sun}
                  active={atlas.depthShading}
                  disabled={mode !== "3d"}
                  onPress={() => atlas.setDepthShading((enabled) => !enabled)}
                />
                <Txt style={{ color: "#a6a0b5", fontSize: 12, lineHeight: 18 }}>
                  {l(
                    "Accentue les reliefs et les espaces entre les structures. L’effet s’adapte automatiquement à votre appareil.",
                    "Accentuates relief and the spaces between structures. The effect adapts automatically to your device.",
                  )}
                </Txt>
              </View>
              {shortScreen && (
                <View style={{ gap: 8 }}>
                  <Txt style={styles.eyebrow}>
                    {l("RÉGIONS DU CORPS", "BODY REGIONS")}
                  </Txt>
                  <View style={styles.wrap}>
                    {atlas.regions.map((region) => (
                      <Action
                        key={region.id}
                        label={region.name[language]}
                        Icon={Focus}
                        active={atlas.activeRegion === region.id}
                        onPress={() => {
                          atlas.setRegionBounds(region.bounds);
                          atlas.setRegionKey((n) => n + 1);
                          atlas.setActiveRegion(region.id);
                          atlas.setDetailMode(false);
                          atlas.setIsolate(false);
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}
              {shortScreen && (
                <View style={styles.wrap}>
                  <Action
                    label={l("Transparence", "Transparency")}
                    Icon={Eye}
                    active={atlas.opacity < 1}
                    onPress={() =>
                      atlas.setOpacity((value) => (value < 1 ? 1 : 0.22))
                    }
                  />
                  <Action
                    label={l("Attaches", "Attachments")}
                    Icon={Activity}
                    onPress={() => {
                      atlas.setInspector("attachments");
                      setPanel("notes");
                    }}
                  />
                  <Action
                    label={l("Agrandir la scène", "Expand scene")}
                    Icon={Maximize2}
                    onPress={() => {
                      setZen(true);
                      setPanel(null);
                    }}
                  />
                  {atlas.detailAvailable && (
                    <Action
                      label={
                        atlas.detailMode
                          ? l("Revenir au corps", "Back to body")
                          : l("Détail HD", "HD detail")
                      }
                      Icon={Sparkles}
                      onPress={toggleDetail}
                    />
                  )}
                </View>
              )}
              <View style={{ gap: 8 }}>
                <Txt style={styles.eyebrow}>
                  {l("RÉFÉRENCE ANATOMIQUE", "ANATOMY REFERENCE")}
                </Txt>
                <View style={styles.wrap}>
                  {atlas.sourceOptions.map((option) => (
                    <Action
                      key={option.id}
                      label={option.name[language]}
                      Icon={option.id === "detailed" ? Activity : Network}
                      active={sourceId === option.id}
                      disabled={!option.available}
                      onPress={() => atlas.changeSource(option.id)}
                    />
                  ))}
                </View>
                <Txt style={{ color: "#a9a5b8", fontSize: 11 }}>
                  {atlas.sourceInfo.description[language]}
                </Txt>
              </View>
              <View style={styles.wrap}>
                <Action
                  label={l("Vue 3D", "3D view")}
                  Icon={Maximize2}
                  active={mode === "3d"}
                  onPress={() => atlas.changeMode("3d")}
                />
                <Action
                  label={l("Vue 2D", "2D view")}
                  Icon={BookOpen}
                  active={mode === "2d"}
                  onPress={() => atlas.changeMode("2d")}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    ) : null;

  return (
    <View testID="anatomy-study-workspace" style={styles.root}>
      <View
        style={[
          styles.header,
          shortScreen && { minHeight: 50, paddingVertical: 2 },
        ]}
      >
        <Action
          label={l("Quitter l’atlas", "Leave atlas")}
          Icon={ArrowLeft}
          iconOnly
          onPress={onExit}
        />
        <Image
          source={require("../../public/brand/ippomed-emblem.png")}
          accessibilityLabel="Ippomed"
          resizeMode="contain"
          style={{ width: 28, height: 32 }}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Txt
            style={{
              color: "#f5f0fa",
              fontWeight: "700",
              fontSize: 16,
              lineHeight: 22,
            }}
          >
            {width >= 360 ? "ippomed " : ""}
            <Txt style={{ color: "#bc9cf2", fontSize: 16 }}>atlas</Txt>
          </Txt>
          {width >= 500 && (
            <Txt style={{ color: "#8f8a9f", fontSize: 10, lineHeight: 14 }}>
              {l(
                "L’espace pour comprendre le corps",
                "Your space to understand the body",
              )}
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 2 }}>
          {(["fr", "en"] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={value === "fr" ? "Français" : "English"}
              aria-pressed={language === value}
              onPress={() => setLanguage(value)}
              style={{
                paddingHorizontal: 8,
                justifyContent: "center",
                minHeight: 42,
              }}
            >
              <Txt
                style={{
                  color: language === value ? "#d3b8fc" : "#8f8a9f",
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {value.toUpperCase()}
              </Txt>
            </Pressable>
          ))}
        </View>
        <Action
          label={l("Cours d’anatomie", "Anatomy courses")}
          Icon={BookOpen}
          iconOnly={width < 500}
          onPress={onCourse}
        />
      </View>
      {!zen && !shortScreen && (
        <ScrollView
          horizontal
          testID="anatomy-quick-views"
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{
            gap: 6,
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          {quickActions()}
        </ScrollView>
      )}
      {!zen && !shortScreen && (
        <View style={styles.regionBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 6,
              alignItems: "center",
              paddingHorizontal: 12,
            }}
          >
            {atlas.regions.map((region) => (
              <Pressable
                key={region.id}
                accessibilityRole="button"
                accessibilityLabel={
                  l("Explorer la région : ", "Explore region: ") +
                  region.name[language]
                }
                aria-pressed={atlas.activeRegion === region.id}
                onPress={() => {
                  atlas.setDetailMode(false);
                  atlas.setIsolate(false);
                  atlas.setRegionBounds(region.bounds);
                  atlas.setRegionKey((n) => n + 1);
                  atlas.setActiveRegion(region.id);
                }}
                style={[
                  styles.region,
                  atlas.activeRegion === region.id && {
                    borderColor: "#8f71bd",
                    backgroundColor: "#32263e",
                  },
                ]}
              >
                <Txt style={{ color: "#d2c7de", fontSize: 11, lineHeight: 15 }}>
                  {region.name[language]}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <View
        style={{
          flex: 1,
          minHeight: 0,
          flexDirection: beside ? "row" : "column",
        }}
      >
        <View style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
          <View
            testID="anatomy-study-stage"
            ref={atlas.stage}
            onLayout={(event) =>
              setCanvasHeight(
                Math.max(120, Math.floor(event.nativeEvent.layout.height)),
              )
            }
            style={{ flex: 1, minHeight: 120, overflow: "hidden" }}
          >
            {mode === "3d" ? (
              <AnatomyScene
                key={sourceId}
                sourceManifest={atlas.anatomyModelManifest}
                appearance={atlas.appearance}
                depthShading={atlas.depthShading}
                section={atlas.section}
                system={system}
                visibleSystems={atlas.visibleSystems}
                view={view}
                selectedId={atlas.selectedId}
                onSelect={(id) => atlas.select(id, true)}
                zoom={atlas.zoom}
                height={canvasHeight}
                isolate={atlas.isolate}
                isolatedDetail={atlas.detailMode}
                opacity={atlas.opacity}
                hiddenIds={atlas.hiddenIds}
                excludedIds={atlas.excludedIds}
                representationIds={atlas.representationIds}
                resetKey={atlas.reset}
                focusSelectionKey={atlas.focusKey}
                focusRegionBounds={atlas.regionBounds}
                focusRegionKey={atlas.regionKey}
                language={language}
              />
            ) : (
              <HumanFigure
                system={system}
                view={view}
                selectedId={
                  selected.views.includes(view)
                    ? (selected.legacyId ?? selected.id)
                    : undefined
                }
                onSelect={(id) => atlas.select(id)}
                zoom={atlas.zoom}
                height={canvasHeight}
                language={language}
              />
            )}
            {!zen && (
              <View pointerEvents="box-none" style={styles.floating}>
                <View style={{ alignSelf: "flex-start" }}>
                  <Action
                    label={atlas.palette.name[language]}
                    Icon={CurrentIcon}
                    onPress={() => toggle("layers")}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Action
                    label={l("Revoir le corps entier", "Show the whole body")}
                    Icon={RotateCcw}
                    iconOnly
                    onPress={atlas.restore}
                  />
                  <Action
                    label={
                      view === "anterior"
                        ? l("Dos", "Back")
                        : l("Face", "Front")
                    }
                    Icon={RotateCcw}
                    onPress={() =>
                      atlas.changeView(
                        view === "anterior" ? "posterior" : "anterior",
                      )
                    }
                  />
                  <Action
                    label={l("Zoomer sur la structure", "Zoom into structure")}
                    Icon={Plus}
                    iconOnly
                    onPress={() => atlas.setZoom((n) => Math.min(3.5, n + 0.5))}
                  />
                  <Action
                    label={l("Dézoomer le corps", "Zoom out of body")}
                    Icon={Minus}
                    iconOnly
                    onPress={() => atlas.setZoom((n) => Math.max(1, n - 0.5))}
                  />
                </View>
              </View>
            )}
            {!!atlas.hiddenHistoryCount && (
              <View
                testID="anatomy-undo-removal"
                style={{ position: "absolute", left: 12, bottom: 60 }}
              >
                <Action
                  label={l("Annuler le retrait", "Undo removal")}
                  Icon={Undo2}
                  onPress={atlas.undoHidden}
                />
              </View>
            )}
            {zen && (
              <View style={{ position: "absolute", top: 12, left: 12 }}>
                <Action
                  label={l("Afficher les outils", "Show tools")}
                  Icon={Maximize2}
                  onPress={() => setZen(false)}
                />
              </View>
            )}
          </View>
          <View testID="anatomy-selection-summary" style={styles.selection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                l("Fiche : ", "Notes: ") + selected.name[language]
              }
              onPress={() => {
                atlas.setInspector("overview");
                toggle("notes");
              }}
              style={{ flex: 1, minWidth: 0, gap: 2, paddingVertical: 5 }}
            >
              <Txt
                style={{
                  color: "#a9a0b7",
                  fontSize: 9,
                  lineHeight: 13,
                  letterSpacing: 0.5,
                }}
              >
                {selected.region[language].toUpperCase()}
              </Txt>
              <Txt
                numberOfLines={1}
                style={{
                  color: "#f2edf8",
                  fontSize: 15,
                  lineHeight: 21,
                  fontWeight: "600",
                }}
              >
                {selected.name[language]}
              </Txt>
            </Pressable>
            <Action
              label={l("Centrer la structure", "Focus structure")}
              Icon={Focus}
              iconOnly
              disabled={!selected.meshIds.length}
              onPress={focusSelection}
            />
            <Action
              label={l("Isoler", "Isolate")}
              Icon={Layers3}
              iconOnly
              disabled={!selected.meshIds.length || atlas.detailMode}
              active={atlas.isolate || atlas.detailMode}
              onPress={() => atlas.setIsolate((value) => !value)}
            />
            <Action
              label={
                atlas.hidden
                  ? l("Afficher la structure", "Show structure")
                  : l("Masquer la structure", "Hide structure")
              }
              Icon={atlas.hidden ? Eye : EyeOff}
              iconOnly
              disabled={!selected.meshIds.length || atlas.detailMode}
              active={atlas.hidden}
              onPress={atlas.toggleHidden}
            />
          </View>
        </View>
        {studyPanel}
      </View>
      {!zen && !shortScreen && (
        <View style={styles.secondaryTools}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 10 }}
          >
            <Action
              label={l("Transparence", "Transparency")}
              Icon={Eye}
              active={atlas.opacity < 1}
              onPress={() =>
                atlas.setOpacity((value) => (value < 1 ? 1 : 0.22))
              }
            />
            <Action
              label={l("Attaches", "Attachments")}
              Icon={Activity}
              active={panel === "notes" && atlas.inspector === "attachments"}
              onPress={() => {
                atlas.setInspector("attachments");
                setPanel("notes");
              }}
            />
            <Action
              label={l("Agrandir la scène", "Expand scene")}
              Icon={Maximize2}
              onPress={() => {
                setZen(true);
                setPanel(null);
              }}
            />
            {atlas.detailAvailable && (
              <Action
                label={
                  atlas.detailMode
                    ? l("Revenir au corps", "Back to body")
                    : l("Détail HD", "HD detail")
                }
                Icon={Sparkles}
                active={atlas.detailMode}
                onPress={toggleDetail}
              />
            )}
          </ScrollView>
        </View>
      )}
      {!zen && (
        <View style={styles.dock}>
          <Action
            label={l("Rechercher", "Search")}
            stacked={width < 600}
            Icon={Search}
            active={panel === "search"}
            onPress={() => toggle("search")}
          />
          <Action
            label={l("Couches", "Layers")}
            stacked={width < 600}
            Icon={Layers3}
            active={panel === "layers"}
            onPress={() => toggle("layers")}
          />
          <Action
            label={l("Fiche", "Notes")}
            stacked={width < 600}
            Icon={BookOpen}
            active={panel === "notes"}
            onPress={() => toggle("notes")}
          />
          <Action
            label={l("Quiz", "Quiz")}
            stacked={width < 600}
            Icon={Sparkles}
            onPress={() => {
              atlas.setInspector("quiz");
              setPanel("notes");
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: "#111219" },
  header: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#171821",
    borderBottomWidth: 1,
    borderColor: "#30313e",
  },
  regionBar: { height: 43, paddingVertical: 5, backgroundColor: "#171821" },
  region: {
    minHeight: 32,
    paddingHorizontal: 11,
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#35313f",
    backgroundColor: "#20212c",
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: "#232431",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "#363544",
  },
  active: { borderColor: "#738256", backgroundColor: "#303b2c" },
  floating: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selection: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#191a24",
    borderTopWidth: 1,
    borderColor: "#30313e",
  },
  panel: { minHeight: 0, backgroundColor: "#21172b", borderColor: "#393044" },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#3b3046",
  },
  eyebrow: {
    color: "#a99ab9",
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1,
    fontWeight: "600",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  layer: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#3c3146",
    gap: 12,
  },
  secondaryTools: {
    height: 52,
    paddingVertical: 4,
    backgroundColor: "#151620",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
    minHeight: 60,
    borderTopWidth: 1,
    borderColor: "#30313e",
    backgroundColor: "#171821",
  },
});
