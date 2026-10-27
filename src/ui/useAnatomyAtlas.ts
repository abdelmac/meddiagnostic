import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Platform, View, useWindowDimensions } from "react-native";
import {
  anatomySystem,
  type AnatomySystem,
  type AnatomyView,
} from "../data/anatomy-structures";
import {
  atlasCatalog,
  anatomyExcludedVesselIds,
  anatomyQuickViews,
  anatomySearchKey,
  type AnatomyQuickView,
  type AnatomyVascularFilter,
  type AtlasSource,
} from "../data/anatomy-catalog";
import { muscleAttachments } from "../data/muscle-attachments";
import { anatomyRegions, type AnatomyBounds } from "../data/anatomy-regions";
import { useI18n } from "../i18n";
import type { AnatomySection } from "../domain/anatomy-section";
import {
  anatomyDissectionReducer,
  emptyAnatomyDissection,
} from "../domain/anatomy-dissection";

export function useAnatomyAtlas({
  initialStructureId,
  focusRequest,
}: { initialStructureId?: string; focusRequest?: string } = {}) {
  const [appearance, setAppearance] = useState<"natural" | "study">("natural");
  const [depthShading, setDepthShading] = useState(true);
  const { language } = useI18n();
  const { width } = useWindowDimensions();
  const compact = width < 1100;
  const l = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [sourceId, setSourceId] = useState<AtlasSource>("extended");
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
  const [vascularFilter, setVascularFilter] =
    useState<AnatomyVascularFilter>("all");
  const [representationIds, setRepresentationIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [resultLimit, setResultLimit] = useState(48);
  const [isolate, setIsolate] = useState(false);
  const [detailMode, setDetailMode] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [dissection, dispatchDissection] = useReducer(
    anatomyDissectionReducer,
    undefined,
    emptyAnatomyDissection,
  );
  const hiddenIds = dissection.hiddenIds;
  const hiddenHistoryCount = dissection.history.length;
  const setHiddenIds = useCallback((value: React.SetStateAction<string[]>) => {
    dispatchDissection({
      type: "set",
      ids: value,
    });
  }, []);
  const undoHidden = () => dispatchDissection({ type: "undo" });
  const restoreHidden = () => dispatchDissection({ type: "restore" });
  const [section, setSection] = useState<AnatomySection | undefined>();
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
  const selectionSectionPosition = (axis: AnatomySection["axis"]) => {
    const dimension = axis === "axial" ? 1 : axis === "sagittal" ? 0 : 2;
    const modelBounds = anatomyModelManifest.bounds;
    const span = modelBounds.max[dimension]! - modelBounds.min[dimension]!;
    const ids = new Set(selected.meshIds);
    const selectedBounds = anatomyModelMeshes
      .filter((mesh) => ids.has(mesh.id) && mesh.bounds)
      .map((mesh) => mesh.bounds!);
    if (!selectedBounds.length || !(span > 0)) return 0.5;
    const minimum = Math.min(
      ...selectedBounds.map((box) => box.min[dimension]!),
    );
    const maximum = Math.max(
      ...selectedBounds.map((box) => box.max[dimension]!),
    );
    const position =
      ((minimum + maximum) / 2 - modelBounds.min[dimension]!) / span;
    return Number.isFinite(position) ? Math.max(0, Math.min(1, position)) : 0.5;
  };
  const startSection = () =>
    setSection({
      axis: "axial",
      position: selectionSectionPosition("axial"),
      inverted: false,
    });
  useEffect(() => setSection(undefined), [sourceId]);
  useEffect(() => {
    if (mode === "2d" || detailMode) setSection(undefined);
  }, [mode, detailMode]);
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
  const excludedIds = useMemo(
    () => anatomyExcludedVesselIds(anatomyModelMeshes, vascularFilter),
    [anatomyModelMeshes, vascularFilter],
  );
  const quickViewCounts = useMemo(() => {
    const wholeBody = atlasCatalog("extended").meshes;
    return Object.fromEntries(
      anatomyQuickViews.map((entry) => [
        entry.id,
        wholeBody.filter(
          (mesh) =>
            mesh.system === entry.system &&
            (entry.vascularFilter === "all" ||
              mesh.vascularKind === entry.vascularFilter),
        ).length,
      ]),
    ) as Record<AnatomyQuickView, number>;
  }, []);
  const quickView: AnatomyQuickView | undefined =
    sourceId !== "extended" || mode !== "3d"
      ? undefined
      : system === "nerves"
        ? "nerves"
        : system === "skeleton"
          ? "bones"
          : system === "vessels" && vascularFilter === "artery"
            ? "arteries"
            : system === "vessels" && vascularFilter === "vein"
              ? "veins"
              : undefined;
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
            (item.system !== "vessels" ||
              vascularFilter === "all" ||
              item.vascularKind === vascularFilter) &&
            (mode === "3d" || item.views.includes(view)),
      ),
    [query, system, view, mode, language, sourceId, vascularFilter],
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
              : item.system === system &&
                (item.system !== "vessels" ||
                  vascularFilter === "all" ||
                  item.vascularKind === vascularFilter),
          ),
    [query, system, mode, sourceId, vascularFilter],
  );

  const select = (id: string, fromModel = false) => {
    const next = atlasStructure(id);
    if (!next) return;
    if (!next.landmark && next.representationGroup) {
      setRepresentationIds((current) => {
        if (current.includes(next.id)) return current;
        return [
          ...current.filter(
            (preferredId) =>
              atlasStructure(preferredId)?.representationGroup !==
              next.representationGroup,
          ),
          next.id,
        ];
      });
    }
    // Global search can select a vessel outside the current subset. Reveal it
    // explicitly rather than leaving a selected, filtered-out structure.
    if (
      next.system === "vessels" &&
      vascularFilter !== "all" &&
      next.vascularKind !== vascularFilter
    )
      setVascularFilter(
        next.vascularKind === "artery" || next.vascularKind === "vein"
          ? next.vascularKind
          : "all",
      );
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
  }, [query, system, vascularFilter]);
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
    setVascularFilter("all");
    setRepresentationIds([]);
    setDetailMode(false);
    setSection(undefined);
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
    setVascularFilter("all");
  };
  const changeVascularFilter = (nextFilter: AnatomyVascularFilter) => {
    if (sourceId !== "extended") return;
    const matches = (item: typeof selected) =>
      item.system === "vessels" &&
      item.meshIds.length > 0 &&
      (nextFilter === "all" || item.vascularKind === nextFilter);
    const next = matches(selected)
      ? selected
      : (atlasLandmarks.find(matches) ?? atlasMeshStructures.find(matches));
    if (!next) return;
    setVascularFilter(nextFilter);
    setSelectedId(next.id);
    setSystem("vessels");
    if (system !== "vessels") setOverlays(["skeleton"]);
    setDetailMode(false);
    setIsolate(false);
    setOpacity(1);
    setSearch("");
  };
  const showQuickView = (id: AnatomyQuickView) => {
    const preset = anatomyQuickViews.find((entry) => entry.id === id)!;
    const nextCatalog = atlasCatalog("extended");
    const matches = (item: typeof selected) =>
      item.system === preset.system &&
      item.meshIds.length > 0 &&
      (preset.vascularFilter === "all" ||
        item.vascularKind === preset.vascularFilter);
    const next =
      nextCatalog.landmarks.find(matches) ??
      nextCatalog.structures.find(matches);
    if (!next) return;
    const changingSource = sourceId !== "extended";
    setSourceId("extended");
    setMode("3d");
    setSystem(preset.system);
    setSelectedId(next.id);
    setVascularFilter(preset.vascularFilter);
    setOverlays(preset.system === "vessels" ? ["skeleton"] : []);
    setDetailMode(false);
    setIsolate(false);
    setOpacity(1);
    setSearch("");
    setSourceError(false);
    // Visibility shortcuts preserve the current camera, section and dissection
    // in the same reference. A source change resets incompatible geometry state.
    if (changingSource) {
      setSection(undefined);
      setHiddenIds([]);
      setRepresentationIds([]);
      setActiveRegion(undefined);
      setRegionBounds(undefined);
      setZoom(1);
      setReset((value) => value + 1);
    }
  };
  const changeMode = (next: "3d" | "2d") => {
    setMode(next);
    setDetailMode(false);
    if (next === "2d") {
      setSection(undefined);
      setVascularFilter("all");
    }
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
    dispatchDissection({
      type: "toggle",
      ids: selected.meshIds,
    });
  const restore = () => {
    setActiveRegion(undefined);
    setRegionBounds(undefined);
    setDetailMode(false);
    setSection(undefined);
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
    hiddenHistoryCount,
    undoHidden,
    restoreHidden,
    section,
    setSection,
    startSection,
    selectionSectionPosition,
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
    representationIds,
    excludedIds,
    vascularFilter,
    changeVascularFilter,
    quickView,
    quickViewCounts,
    showQuickView,
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
    depthShading,
    setDepthShading,
  };
}
export type AnatomyAtlasState = ReturnType<typeof useAnatomyAtlas>;
