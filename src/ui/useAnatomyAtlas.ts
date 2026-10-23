import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import {
  anatomySystem,
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
import { useI18n } from "../i18n";

export function useAnatomyAtlas({
  initialStructureId,
  focusRequest,
}: { initialStructureId?: string; focusRequest?: string } = {}) {
  const [appearance, setAppearance] = useState<"natural" | "study">("natural");
  const { language } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 1100;
  const l = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [sourceId, setSourceId] = useState<AtlasSource>("detailed");
  const catalog = atlasCatalog(sourceId);
  const {
    manifest: anatomyModelManifest,
    meshes: anatomyModelMeshes,
    landmarks: atlasLandmarks,
    structures: atlasMeshStructures,
    structure: atlasStructure,
    quizStructureId: atlasQuizStructureId,
  } = catalog;
  const detailMeshIds = useMemo(
    () =>
      new Set(
        anatomyModelManifest.isolatedDetails?.entries.map(
          (entry) => entry.id,
        ) ?? [],
      ),
    [anatomyModelManifest],
  );
  const initial =
    atlasStructure(initialStructureId ?? "deltoid") ??
    atlasStructure("deltoid")!;
  const [system, setSystem] = useState<AnatomySystem>(initial.system);
  const [view, setView] = useState<AnatomyView>(initial.views[0]!);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
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
  const [regionBounds, setRegionBounds] = useState<AnatomyBounds | undefined>();
  const [regionKey, setRegionKey] = useState(0);
  const [activeRegion, setActiveRegion] = useState<string | undefined>();
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
  const regions = useMemo(
    () => anatomyRegions(anatomyModelManifest.bounds),
    [anatomyModelManifest],
  );
  const muscle = selected.legacyId
    ? muscleAttachments[selected.legacyId]
    : undefined;
  const quizId = atlasQuizStructureId(selected.id);
  const alternateSource: AtlasSource =
    sourceId === "detailed" ? "extended" : "detailed";
  const alternateStructure = atlasCatalog(alternateSource).structure(
    selected.legacyId ?? selected.id,
  );
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
    [query, system, view, mode, language, sourceId],
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
    [query, system, mode, sourceId],
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
    if (!initialStructureId) return;
    const target = atlasStructure(initialStructureId);
    if (!target) return;
    select(initialStructureId);
    if (target.meshIds.length) {
      setActiveRegion(undefined);
      setRegionBounds(undefined);
      setFocusKey((value) => value + 1);
    }
  }, [initialStructureId, focusRequest]);
  useEffect(() => {
    setResultLimit(48);
  }, [query, system]);
  const changeSource = (nextSource: AtlasSource) => {
    if (nextSource === sourceId) return;
    const nextCatalog = atlasCatalog(nextSource);
    const next =
      nextCatalog.structure(selected.legacyId) ??
      nextCatalog.structures.find((entry) => entry.fmaId === selected.fmaId) ??
      nextCatalog.landmarks.find(
        (entry) => entry.system === system && entry.meshIds.length,
      ) ??
      nextCatalog.structures.find((entry) => entry.system === system) ??
      nextCatalog.structure("deltoid")!;
    setSourceId(nextSource);
    setAppearance(nextSource === "detailed" ? "natural" : "study");
    setSelectedId(next.id);
    setSystem(next.system);
    setDetailMode(false);
    setHiddenIds([]);
    setOverlays(["skeleton"]);
    setZoom(1);
    setIsolate(false);
    setOpacity(1);
    setSearch("");
    setActiveRegion(undefined);
    setRegionBounds(undefined);
    setReset((value) => value + 1);
  };
  const changeSystem = (nextSystem: AnatomySystem) => {
    setDetailMode(false);
    setOverlays(nextSystem === "muscles" ? ["skeleton"] : []);
    setSearch("");
    setIsolate(false);
    setOpacity(1);
    const next =
      atlasLandmarks.find(
        (item) =>
          item.system === nextSystem &&
          item.meshIds.length > 0 &&
          item.views.includes(view),
      ) ??
      atlasLandmarks.find(
        (item) => item.system === nextSystem && item.meshIds.length > 0,
      ) ??
      atlasMeshStructures.find((item) => item.system === nextSystem) ??
      atlasLandmarks.find((item) => item.system === nextSystem)!;
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
    setActiveRegion(undefined);
    setRegionBounds(undefined);
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
    setActiveRegion(undefined);
    setRegionBounds(undefined);
    setDetailMode(false);
    setHiddenIds([]);
    setIsolate(false);
    setOpacity(1);
    setZoom(1);
    setReset((value) => value + 1);
  };

  return {
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
  };
}
export type AnatomyAtlasState = ReturnType<typeof useAnatomyAtlas>;
