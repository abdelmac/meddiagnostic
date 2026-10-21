import type { AnatomyLanguage, AnatomySystem, AnatomyView } from "../data/anatomy-structures";

export type AnatomySceneProps = {
  system: AnatomySystem;
  view: AnatomyView;
  selectedId?: string;
  onSelect?: (id: string) => void;
  zoom?: number;
  height?: number;
  language?: AnatomyLanguage;
  isolate?: boolean;
  opacity?: number;
  showAttachments?: boolean;
  resetKey?: number;
};
