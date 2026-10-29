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
  atlasSourceAvailable,
  atlasSourceIds,
  atlasSources,
  defaultAtlasSource,
  defaultNetworkSource,
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
  const [sourceId, setSourceId] = useState<AtlasSource>(defaultAtlasSource);
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
    (initialStructureId ? atlasStructure(initialStructureId) : undefined) ??
    [atlasStructure("deltoid"), ...atlasLandmarks.filter(item => item.system === "nerves"), ...atlasLandmarks]
      .find(item => item && item.meshIds.length > 0) ??
    atlasMeshStructures[0] ?? atlasStructure("deltoid")!;
  const [system, setSystem] = useState<AnatomySystem>(initial.system);
  const [view, setView] = useState<AnatomyView>(initial.views[0]!);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [overlays, setOverlays] = useState<AnatomySystem[]>(
    initial.system !== "nerves" && anatomyModelManifest.systems.some(item => item.id === "skeleton" && item.files.length)
      ? ["skeleton"] : [],
  );
  const [vascularFilter, setVascularFilter] =
    useState<AnatomyVascularFilter>("all");
  const [representationIds, setRepresentationIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [newDetailsOnly, setNewDetailsOnly] = useState(false);
  const newDetailIds = useMemo(
    () => new Set(anatomyModelManifest.detailExpansion?.newMeshIds ?? []),
    [anatomyModelManifest],
  );
  const regionalDetails = atlasCatalog("regional").manifest.detailExpansion;
  const newDetailCount = regionalDetails?.newConceptIds.length ?? 0;
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
  const alternate = atlasSourceIds
    .filter(id => id !== sourceId && atlasSourceAvailable(id))
    .map(id => {
      const other = atlasCatalog(id);
      const structure = other.structure(selected.legacyId ?? selected.id)
        ?? (selected.fmaId ? other.structures.find(item => item.fmaId === selected.fmaId) : undefined);
      return { id, structure };
    })
    .find(candidate => candidate.structure?.meshIds.length);
  const alternateSource: AtlasSource = alternate?.id ?? defaultNetworkSource;
  const alternateStructure = alternate?.structure;
  const sourceOptions = atlasSourceIds.map(id => ({ id, ...atlasSources[id], available: atlasSourceAvailable(id) }));
  const sourceInfo = atlasSources[sourceId];
  const sourceAttributionUrl = anatomyModelManifest.attributionUrl
    ?? `/anatomy/${sourceId === "detailed" ? "bodyparts3d-complete" : sourceId === "regional" ? "bodyparts3d-regional" : "bodyparts3d"}/ATTRIBUTION.txt`;
  const systemAvailable = (id: AnatomySystem) => mode === "2d"
    || anatomyModelManifest.systems.some(item => item.id === id && item.files.length > 0);
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
    const wholeBody = atlasCatalog(defaultNetworkSource).meshes;
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
  const currentViewCounts = useMemo(() => Object.fromEntries(
    anatomyQuickViews.map(entry => [entry.id, anatomyModelMeshes.filter(mesh =>
      mesh.system === entry.system && (entry.vascularFilter === "all" || mesh.vascularKind === entry.vascularFilter),
    ).length]),
  ) as Record<AnatomyQuickView, number>, [anatomyModelMeshes]);
  const quickView: AnatomyQuickView | undefined =
    sourceId !== defaultNetworkSource || mode !== "3d"
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
      newDetailsOnly ? [] : atlasLandmarks.filter((item) =>
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
    [query, system, view, mode, language, sourceId, vascularFilter, newDetailsOnly],
  );
  const results = useMemo(
    () =>
      mode === "2d"
        ? []
        : atlasMeshStructures.filter((item) =>
            (!newDetailsOnly || newDetailIds.has(item.id)) && (query
              ? anatomySearchKey(
                  item.name.fr +
                    " " +
                    item.name.en +
                    " " +
                    (item.sourceName ?? "") +
                    " " +
                    item.id +
                    " " +
                    (item.fmaId ?? ""),
                ).includes(query)
              : newDetailsOnly || item.system === system &&
                (item.system !== "vessels" ||
                  vascularFilter === "all" ||
                  item.vascularKind === vascularFilter)),
          ),
    [query, system, mode, sourceId, vascularFilter, newDetailsOnly, newDetailIds],
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
  }, [query, system, vascularFilter, newDetailsOnly]);
  const changeSource = (nextSource: AtlasSource, options?: { newDetails?: boolean; structureId?: string }) => {
    if ((nextSource === sourceId && !options) || !atlasSourceAvailable(nextSource)) return;
    const nextCatalog = atlasCatalog(nextSource);
    const mapped = nextCatalog.structure(selected.legacyId);
    const mappedSystemAvailable = mapped && (mode === "2d" || (mapped.meshIds.length > 0 && nextCatalog.manifest.systems.some(item => item.id === mapped.system && item.files.length)));
    const next =
      nextCatalog.structure(options?.structureId) ??
      (mappedSystemAvailable ? mapped : undefined) ??
      (selected.fmaId ? nextCatalog.structures.find((entry) => entry.fmaId === selected.fmaId && entry.meshIds.length) : undefined) ??
      nextCatalog.landmarks.find(
        (entry) => entry.system === system && entry.meshIds.length,
      ) ??
      nextCatalog.structures.find((entry) => entry.system === system) ??
      nextCatalog.landmarks.find(entry => entry.meshIds.length) ??
      nextCatalog.structures[0] ??
      nextCatalog.structure("deltoid")!;
    setSourceId(nextSource);
    setNewDetailsOnly(options?.newDetails === true);
    if (options?.newDetails) setMode("3d");
    setAppearance(nextSource === "detailed" || nextSource === "regional" ? "natural" : "study");
    setSelectedId(next.id);
    setSystem(next.system);
    setVascularFilter("all");
    setRepresentationIds([]);
    setDetailMode(false);
    setSection(undefined);
    setHiddenIds([]);
    setOverlays(next.system !== "nerves" && nextCatalog.manifest.systems.some(item => item.id === "skeleton" && item.files.length) ? ["skeleton"] : []);
    setZoom(1);
    setIsolate(false);
    setOpacity(1);
    setSearch("");
    setActiveRegion(undefined);
    setRegionBounds(undefined);
    setReset((value) => value + 1);
  };
  const exploreNewDetails = () => {
    const regional = atlasCatalog("regional");
    const first = regional.manifest.detailExpansion?.newMeshIds[0];
    if (!first) return;
    changeSource("regional", { newDetails: true, structureId: first });
  };
  const changeSystem = (nextSystem: AnatomySystem) => {
    if (!systemAvailable(nextSystem)) return;
    setDetailMode(false);
    setNewDetailsOnly(false);
    setOverlays(nextSystem === "muscles" && anatomyModelManifest.systems.some(item => item.id === "skeleton" && item.files.length) ? ["skeleton"] : []);
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
    if (!atlasSources[sourceId].networks) return;
    const matches = (item: typeof selected) =>
      item.system === "vessels" &&
      item.meshIds.length > 0 &&
      (nextFilter === "all" || item.vascularKind === nextFilter);
    const next = matches(selected)
      ? selected
      : (atlasLandmarks.find(matches) ?? atlasMeshStructures.find(matches));
    if (!next) return;
    setNewDetailsOnly(false);
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
    const nextCatalog = atlasCatalog(defaultNetworkSource);
    const matches = (item: typeof selected) =>
      item.system === preset.system &&
      item.meshIds.length > 0 &&
      (preset.vascularFilter === "all" ||
        item.vascularKind === preset.vascularFilter);
    const next =
      nextCatalog.landmarks.find(matches) ??
      nextCatalog.structures.find(matches);
    if (!next) return;
    const changingSource = sourceId !== defaultNetworkSource;
    setSourceId(defaultNetworkSource);
    setNewDetailsOnly(false);
    setMode("3d");
    setSystem(preset.system);
    setSelectedId(next.id);
    setVascularFilter(preset.vascularFilter);
    setOverlays(preset.system === "vessels" && nextCatalog.manifest.systems.some(item => item.id === "skeleton" && item.files.length) ? ["skeleton"] : []);
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
      setNewDetailsOnly(false);
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
    sourceOptions,
    sourceInfo,
    sourceAttributionUrl,
    systemAvailable,
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
    newDetailsOnly,
    setNewDetailsOnly,
    newDetailCount,
    newDetailIds,
    exploreNewDetails,
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
    currentViewCounts,
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
