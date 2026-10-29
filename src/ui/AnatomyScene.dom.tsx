"use dom";

import React, { useCallback, useEffect, useMemo } from "react";
import type { DOMProps } from "expo/dom";
import detailedManifest from "../data/bodyparts3d-complete-manifest.json";
import extendedManifest from "../data/bodyparts3d-manifest.json";
import comprehensiveManifest from "../data/z-anatomy-manifest.json";
import regionalManifest from "../data/bodyparts3d-regional-manifest.json";
import {
  ANATOMY_ASSET_ORIGIN,
  ANATOMY_NATIVE_CHANNEL,
  parseAnatomyNativeState,
  type NativeAnatomyEvent,
  type NativeAnatomyState,
} from "../domain/anatomy-native-bridge";
import { AnatomyScene } from "./AnatomyScene.web";
import type { BodyPartsManifest } from "./anatomy-gltf.web";

type Props = {
  state: NativeAnatomyState;
  onEvent: (event: NativeAnatomyEvent) => Promise<void>;
  dom?: DOMProps;
};
type EventPayload<T = NativeAnatomyEvent> = T extends unknown
  ? Omit<T, "channel" | "version" | "source">
  : never;
class RendererBoundary extends React.Component<
  { children: React.ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? (
      <div role="alert">3D unavailable</div>
    ) : (
      this.props.children
    );
  }
}

/** This module and Three.js ship inside the binary; no remote application page. */
export default function AnatomySceneDOM({ state: input, onEvent }: Props) {
  const state = parseAnatomyNativeState(input);
  const source = state?.source ?? "extended";
  const manifest = useMemo(
    () =>
      ({
        ...({ detailed: detailedManifest, extended: extendedManifest, comprehensive: comprehensiveManifest, regional: regionalManifest }[source]),
        assetBaseUrl: ANATOMY_ASSET_ORIGIN,
      }) as unknown as BodyPartsManifest,
    [source],
  );
  const notify = useCallback(
    (event: EventPayload) => {
      void onEvent({
        channel: ANATOMY_NATIVE_CHANNEL,
        version: 1,
        source,
        ...event,
      } as NativeAnatomyEvent).catch(() => {});
    },
    [onEvent, source],
  );
  useEffect(() => {
    if (state) notify({ type: "mounted" });
    else notify({ type: "error", code: "state" });
    // The embedded renderer has no external navigation. Block accidental links
    // as well; never expose an arbitrary destination through a native action.
    const blockLink = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.("a[href]"))
        event.preventDefault();
    };
    document.addEventListener("click", blockLink, true);
    return () => document.removeEventListener("click", blockLink, true);
  }, [notify, !!state]);
  if (!state) return null;
  return (
    <div
      style={{
        width: "100%",
        height: state.height,
        overflow: "hidden",
        background: "#171120",
        touchAction: "none",
      }}
    >
      <RendererBoundary
        onFailure={() => notify({ type: "error", code: "renderer" })}
      >
        <AnatomyScene
          {...state}
          sourceManifest={manifest}
          onSelect={(id) => notify({ type: "select", id })}
          onReady={(info) => notify({ type: "ready", ...info })}
        />
      </RendererBoundary>
    </div>
  );
}
