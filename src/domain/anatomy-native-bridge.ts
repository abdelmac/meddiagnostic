import type {
  AnatomyLanguage,
  AnatomySystem,
  AnatomyView,
} from "../data/anatomy-structures";
import {
  normalizeAnatomySection,
  type AnatomySection,
} from "./anatomy-section";

/** Public geometry only. Account cookies and credentials never cross this boundary. */
export const ANATOMY_ASSET_ORIGIN =
  "https://medquiz-europe.medcompass-web.workers.dev";
export const ANATOMY_NATIVE_CHANNEL = "ippomed.anatomy";
export const ANATOMY_NATIVE_VERSION = 1;
export type NativeAnatomySource = "detailed" | "extended";
export type NativeAnatomyBounds = { min: number[]; max: number[] };
export type NativeAnatomyState = {
  version: 1;
  source: NativeAnatomySource;
  system: AnatomySystem;
  view: AnatomyView;
  language: AnatomyLanguage;
  appearance: "natural" | "study";
  depthShading: boolean;
  section?: AnatomySection;
  selectedId?: string;
  zoom: number;
  height: number;
  opacity: number;
  isolate: boolean;
  isolatedDetail: boolean;
  hiddenIds: string[];
  excludedIds: string[];
  representationIds: string[];
  visibleSystems: AnatomySystem[];
  resetKey: number;
  focusSelectionKey: number;
  focusRegionKey: number;
  focusRegionBounds?: NativeAnatomyBounds;
};
const systems: readonly AnatomySystem[] = [
  "muscles",
  "nerves",
  "skeleton",
  "organs",
  "vessels",
];
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
const key = (value: unknown): value is number =>
  finite(value, 0, Number.MAX_SAFE_INTEGER) && Number.isInteger(value);
export const validAnatomyBridgeId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,95}$/.test(value);
const ids = (value: unknown, maximum = 4000): value is string[] =>
  Array.isArray(value) &&
  value.length <= maximum &&
  value.every(validAnatomyBridgeId) &&
  new Set(value).size === value.length;
const isSystem = (value: unknown): value is AnatomySystem =>
  systems.includes(value as AnatomySystem);
const bounds = (value: unknown): value is NativeAnatomyBounds =>
  object(value) &&
  Array.isArray(value.min) &&
  Array.isArray(value.max) &&
  value.min.length === 3 &&
  value.max.length === 3 &&
  value.min.every(
    (v, a) =>
      finite(v, -10, 10) &&
      finite((value.max as unknown[])[a], -10, 10) &&
      v <= Number((value.max as unknown[])[a]),
  );

/** Rebuild the allowlisted value; never forward arbitrary objects or credentials. */
export function parseAnatomyNativeState(
  value: unknown,
): NativeAnatomyState | undefined {
  if (
    !object(value) ||
    value.version !== 1 ||
    (value.source !== "detailed" && value.source !== "extended") ||
    !isSystem(value.system) ||
    (value.view !== "anterior" && value.view !== "posterior") ||
    (value.language !== "fr" && value.language !== "en") ||
    (value.appearance !== "natural" && value.appearance !== "study") ||
    (value.depthShading !== undefined &&
      typeof value.depthShading !== "boolean")
  )
    return;
  const section =
    value.section === undefined
      ? undefined
      : normalizeAnatomySection(value.section);
  if (value.section !== undefined && !section) return;
  if (value.selectedId !== undefined && !validAnatomyBridgeId(value.selectedId))
    return;
  if (
    !finite(value.zoom, 1, 4) ||
    !finite(value.height, 120, 1600) ||
    !finite(value.opacity, 0, 1) ||
    typeof value.isolate !== "boolean" ||
    typeof value.isolatedDetail !== "boolean"
  )
    return;
  if (
    !ids(value.hiddenIds) ||
    (value.excludedIds !== undefined && !ids(value.excludedIds)) ||
    (value.representationIds !== undefined && !ids(value.representationIds)) ||
    !Array.isArray(value.visibleSystems) ||
    !value.visibleSystems.length ||
    value.visibleSystems.length > 5 ||
    !value.visibleSystems.every(isSystem) ||
    new Set(value.visibleSystems).size !== value.visibleSystems.length
  )
    return;
  if (
    !key(value.resetKey) ||
    !key(value.focusSelectionKey) ||
    !key(value.focusRegionKey) ||
    (value.focusRegionBounds !== undefined && !bounds(value.focusRegionBounds))
  )
    return;
  return {
    version: 1,
    source: value.source as NativeAnatomySource,
    system: value.system,
    view: value.view as AnatomyView,
    language: value.language as AnatomyLanguage,
    appearance: value.appearance as NativeAnatomyState["appearance"],
    depthShading: value.depthShading === undefined ? true : value.depthShading,
    ...(section ? { section } : {}),
    ...(value.selectedId === undefined
      ? {}
      : { selectedId: value.selectedId as string }),
    zoom: value.zoom,
    height: value.height,
    opacity: value.opacity,
    isolate: value.isolate,
    isolatedDetail: value.isolatedDetail,
    hiddenIds: [...value.hiddenIds],
    excludedIds:
      value.excludedIds === undefined
        ? []
        : [...(value.excludedIds as string[])],
    representationIds:
      value.representationIds === undefined
        ? []
        : [...(value.representationIds as string[])],
    visibleSystems: [...value.visibleSystems] as AnatomySystem[],
    resetKey: value.resetKey,
    focusSelectionKey: value.focusSelectionKey,
    focusRegionKey: value.focusRegionKey,
    ...(value.focusRegionBounds === undefined
      ? {}
      : {
          focusRegionBounds: {
            min: [...(value.focusRegionBounds as NativeAnatomyBounds).min],
            max: [...(value.focusRegionBounds as NativeAnatomyBounds).max],
          },
        }),
  };
}

export type NativeAnatomyEvent = { source: NativeAnatomySource } & (
  | { channel: typeof ANATOMY_NATIVE_CHANNEL; version: 1; type: "mounted" }
  | {
      channel: typeof ANATOMY_NATIVE_CHANNEL;
      version: 1;
      type: "select";
      id: string;
    }
  | {
      channel: typeof ANATOMY_NATIVE_CHANNEL;
      version: 1;
      type: "ready";
      meshCount: number;
      structureIds: string[];
    }
  | {
      channel: typeof ANATOMY_NATIVE_CHANNEL;
      version: 1;
      type: "error";
      code: "renderer" | "state";
    }
);

/** The DOM bundle can only select actual IDs from its current local catalogue. */
export function parseAnatomyNativeEvent(
  value: unknown,
  allowedIds: ReadonlySet<string>,
  expectedSource: NativeAnatomySource,
): NativeAnatomyEvent | undefined {
  if (
    !object(value) ||
    value.channel !== ANATOMY_NATIVE_CHANNEL ||
    value.version !== 1 ||
    value.source !== expectedSource
  )
    return;
  const envelope = {
    channel: ANATOMY_NATIVE_CHANNEL,
    version: 1,
    source: expectedSource,
  } as const;
  if (value.type === "mounted") return { ...envelope, type: "mounted" };
  if (
    value.type === "error" &&
    (value.code === "renderer" || value.code === "state")
  )
    return { ...envelope, type: "error", code: value.code };
  if (
    value.type === "select" &&
    validAnatomyBridgeId(value.id) &&
    allowedIds.has(value.id)
  )
    return { ...envelope, type: "select", id: value.id };
  if (
    value.type === "ready" &&
    key(value.meshCount) &&
    value.meshCount > 0 &&
    value.meshCount <= 10000 &&
    ids(value.structureIds) &&
    value.structureIds.length > 0 &&
    value.meshCount >= value.structureIds.length &&
    value.structureIds.every((id) => allowedIds.has(id))
  )
    return {
      ...envelope,
      type: "ready",
      meshCount: value.meshCount,
      structureIds: [...value.structureIds],
    };
}

/** Only our pinned public model directories are valid remote resources. */
export function anatomyNativeAssetUrl(value: string): string | undefined {
  if (
    !/^\/anatomy\/(bodyparts3d|bodyparts3d-complete)\/[a-zA-Z0-9_./-]+\.glb$/.test(
      value,
    ) ||
    value.includes("..") ||
    value.includes("//")
  )
    return;
  const resolved = new URL(value, ANATOMY_ASSET_ORIGIN);
  return resolved.protocol === "https:" &&
    resolved.origin === ANATOMY_ASSET_ORIGIN
    ? resolved.href
    : undefined;
}
