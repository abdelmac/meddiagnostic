import type {
  AnatomyLanguage,
  AnatomySystem,
  AnatomyView,
} from "../data/anatomy-structures";

export type AnatomySceneProps = {
  appearance?: "natural" | "study";
  depthShading?: boolean;
  section?: import("../domain/anatomy-section").AnatomySection;
  sourceManifest?: import("./anatomy-gltf.web").BodyPartsManifest;
  system: AnatomySystem;
  view: AnatomyView;
  selectedId?: string;
  onSelect?: (id: string) => void;
  zoom?: number;
  height?: number;
  language?: AnatomyLanguage;
  isolate?: boolean;
  isolatedDetail?: boolean;
  opacity?: number;
  showAttachments?: boolean;
  resetKey?: number;
  hiddenIds?: readonly string[];
  /** Source-aware layer subsets, separate from user dissection history. */
  excludedIds?: readonly string[];
  /** Physical source choices, one per group, independent of current selection. */
  representationIds?: readonly string[];
  visibleSystems?: readonly AnatomySystem[];
  focusSelectionKey?: number;
  focusRegionBounds?: { min: number[]; max: number[] };
  focusRegionKey?: number;
  onReady?: (info: { meshCount: number; structureIds: string[] }) => void;
};
