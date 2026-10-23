import type {
  AnatomyLanguage,
  AnatomySystem,
  AnatomyView,
} from "../data/anatomy-structures";

export type AnatomySceneProps = {
  appearance?: "natural" | "study";
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
  visibleSystems?: readonly AnatomySystem[];
  focusSelectionKey?: number;
  focusRegionBounds?: { min: number[]; max: number[] };
  focusRegionKey?: number;
  onReady?: (info: { meshCount: number; structureIds: string[] }) => void;
};
