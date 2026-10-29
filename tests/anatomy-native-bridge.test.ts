import test from "node:test";
import assert from "node:assert/strict";
import {
  ANATOMY_ASSET_ORIGIN,
  ANATOMY_NATIVE_CHANNEL,
  ANATOMY_NATIVE_MAX_IDS,
  anatomyNativeAssetUrl,
  anatomySourceForDataset,
  parseAnatomyNativeEvent,
  parseAnatomyNativeState,
  type NativeAnatomyState,
} from "../src/domain/anatomy-native-bridge";

const state: NativeAnatomyState = {
  version: 1,
  source: "detailed",
  system: "muscles",
  view: "posterior",
  language: "en",
  appearance: "natural",
  depthShading: true,
  selectedId: "FMA13377",
  zoom: 2.5,
  height: 580,
  opacity: 0.35,
  isolate: true,
  isolatedDetail: false,
  hiddenIds: ["FMA7163"],
  excludedIds: ["FMA13378"],
  representationIds: ["FMA13378"],
  visibleSystems: ["muscles", "skeleton"],
  resetKey: 2,
  focusSelectionKey: 3,
  focusRegionKey: 4,
  focusRegionBounds: { min: [-0.3, 0.5, -0.2], max: [0.3, 1.5, 0.2] },
};
const allowed = new Set(["FMA13377", "FMA13378", "rectus-abdominis"]);
const envelope = {
  channel: ANATOMY_NATIVE_CHANNEL,
  version: 1,
  source: "detailed",
};

test("native state preserves study controls across its JSON transport", () => {
  const parsed = parseAnatomyNativeState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(parsed, state);
  assert.deepEqual(
    parseAnatomyNativeState({
      ...state,
      source: "extended",
      appearance: "study",
    })?.source,
    "extended",
  );
  assert.equal(
    parseAnatomyNativeState({ ...state, height: 120 })?.height,
    120,
    "landscape workspace remains valid",
  );
});

test("regional anatomy transports more than four thousand source models without truncation", () => {
  const sourceIds = Array.from({ length: 5520 }, (_, index) => `FMA${index + 1000}_MM${index}`);
  const input = { ...state, source: "regional", selectedId: sourceIds.at(-1), hiddenIds: sourceIds, excludedIds: sourceIds, representationIds: sourceIds };
  const parsed = parseAnatomyNativeState(JSON.parse(JSON.stringify(input)))!;
  assert.equal(parsed.source, "regional");
  for (const field of ["hiddenIds", "excludedIds", "representationIds"] as const) {
    assert.equal(parsed[field].length, 5520);
    assert.equal(parsed[field].at(-1), sourceIds.at(-1));
    assert.notEqual(parsed[field], sourceIds);
  }
  const ready = { ...envelope, source: "regional", type: "ready", meshCount: 5520, structureIds: sourceIds };
  assert.deepEqual(parseAnatomyNativeEvent(ready, new Set(sourceIds), "regional"), ready);
  assert.equal(parseAnatomyNativeEvent({ ...ready, source: "extended" }, new Set(sourceIds), "regional"), undefined);
  assert.equal(anatomySourceForDataset("bodyparts3d-3.0-95"), "detailed");
  assert.equal(anatomySourceForDataset("bodyparts3d-4.3"), "extended");
});

test("regional anatomy has its own native dataset and rejects callbacks from other bodies", () => {
  assert.equal(anatomySourceForDataset("bodyparts3d-2018"), "regional");
  assert.equal(anatomySourceForDataset(undefined), undefined);
  assert.equal(anatomySourceForDataset("z-anatomy-neurovascular"), undefined);
  assert.equal(anatomySourceForDataset("unknown-reference"), undefined);
  const regional = { ...state, source: "regional" } as const;
  assert.deepEqual(parseAnatomyNativeState(JSON.parse(JSON.stringify(regional))), regional);
  const select = { ...envelope, source: "regional", type: "select", id: "FMA13377" };
  assert.deepEqual(parseAnatomyNativeEvent(select, allowed, "regional"), select);
  const ready = { ...envelope, source: "regional", type: "ready", meshCount: 2, structureIds: ["FMA13377", "FMA13378"] };
  assert.deepEqual(parseAnatomyNativeEvent(ready, allowed, "regional"), ready);
  assert.equal(parseAnatomyNativeEvent({ ...select, id: "FMA_NOT_REAL" }, allowed, "regional"), undefined);
  for (const source of ["extended", "detailed"] as const) {
    assert.equal(parseAnatomyNativeEvent({ ...select, source }, allowed, "regional"), undefined);
    assert.equal(parseAnatomyNativeEvent({ ...ready, source }, allowed, "regional"), undefined);
    assert.equal(parseAnatomyNativeEvent(select, allowed, source), undefined);
  }
  assert.equal(parseAnatomyNativeState({ ...state, source: "comprehensive" }), undefined);
  assert.equal(parseAnatomyNativeEvent({ ...select, source: "comprehensive" }, allowed, "regional"), undefined);
  assert.equal(parseAnatomyNativeEvent({ ...ready, source: "comprehensive" }, allowed, "regional"), undefined);
  assert.equal(parseAnatomyNativeEvent({ ...select, source: "comprehensive" }, allowed, "comprehensive" as never), undefined, "untyped callers cannot reopen a retired source by matching its legacy envelope");
});

test("state transport strips unrelated account fields and copies nested state", () => {
  const input = {
    ...state,
    access_token: "not-forwarded",
    email: "private@example.test",
    sourceManifest: { assetBaseUrl: "https://attacker.test" },
  };
  const parsed = parseAnatomyNativeState(input)!;
  assert.deepEqual(parsed, state);
  parsed.hiddenIds.push("FMA13378");
  parsed.excludedIds.push("FMA7163");
  parsed.representationIds.push("FMA7163");
  parsed.focusRegionBounds!.min[0] = -1;
  assert.deepEqual(state.hiddenIds, ["FMA7163"]);
  assert.deepEqual(state.excludedIds, ["FMA13378"]);
  assert.deepEqual(state.representationIds, ["FMA13378"]);
  assert.equal(state.focusRegionBounds!.min[0], -0.3);
});

test("layer subsets remain separate from dissection and support older native state", () => {
  const { excludedIds: _excludedIds, ...legacyState } = state;
  const legacy = parseAnatomyNativeState(
    JSON.parse(JSON.stringify(legacyState)),
  )!;
  assert.deepEqual(legacy.excludedIds, []);
  assert.deepEqual(legacy.hiddenIds, state.hiddenIds);
  for (const excludedIds of [
    null,
    "FMA13378",
    ["../private"],
    ["FMA13378", "FMA13378"],
    Array.from({ length: ANATOMY_NATIVE_MAX_IDS + 1 }, (_, index) => `FMA${index}`),
  ])
    assert.equal(parseAnatomyNativeState({ ...state, excludedIds }), undefined);
});

test("physical representation preferences survive JSON without sharing or forwarding unrelated state", () => {
  const input = JSON.parse(
    JSON.stringify({
      ...state,
      representationIds: ["FMA13378", "FMA7163"],
      account: { token: "private" },
    }),
  );
  const parsed = parseAnatomyNativeState(input)!;
  assert.deepEqual(parsed.representationIds, ["FMA13378", "FMA7163"]);
  assert.equal("account" in parsed, false);
  parsed.representationIds.pop();
  assert.deepEqual(input.representationIds, ["FMA13378", "FMA7163"]);
  assert.deepEqual(parsed.hiddenIds, state.hiddenIds);
  const { representationIds: _representationIds, ...legacyState } = state;
  assert.deepEqual(parseAnatomyNativeState(legacyState)?.representationIds, []);
  for (const representationIds of [
    null,
    {},
    "FMA13378",
    ["../private"],
    ["FMA13378", "FMA13378"],
    Array.from({ length: ANATOMY_NATIVE_MAX_IDS + 1 }, (_, index) => `FMA${index}`),
  ])
    assert.equal(
      parseAnatomyNativeState({ ...state, representationIds }),
      undefined,
    );
});

test("depth shading accepts only booleans and defaults to enabled for older native states", () => {
  for (const depthShading of [false, true]) {
    const input = JSON.parse(JSON.stringify({ ...state, depthShading }));
    const parsed = parseAnatomyNativeState(input)!;
    assert.equal(parsed.depthShading, depthShading);
    parsed.depthShading = !depthShading;
    assert.equal(input.depthShading, depthShading);
  }
  const { depthShading: _depthShading, ...legacyState } = state;
  assert.equal(
    parseAnatomyNativeState(JSON.parse(JSON.stringify(legacyState)))
      ?.depthShading,
    true,
  );
  for (const depthShading of [
    null,
    0,
    1,
    "true",
    "false",
    [],
    {},
    { enabled: true },
  ])
    assert.equal(
      parseAnatomyNativeState({ ...state, depthShading }),
      undefined,
    );
});

test("virtual section controls survive JSON and only expose bounded rendering state", () => {
  for (const axis of ["axial", "sagittal", "coronal"] as const) {
    for (const position of [0, 0.337, 1]) {
      const section = { axis, position, inverted: true };
      const input = JSON.parse(
        JSON.stringify({
          ...state,
          section: {
            ...section,
            access_token: "private",
            account: { id: "hidden" },
          },
        }),
      );
      const parsed = parseAnatomyNativeState(input)!;
      assert.deepEqual(parsed.section, section);
      parsed.section!.position = 0.5;
      assert.equal(input.section.position, position);
    }
  }
  for (const section of [
    null,
    [],
    { axis: "axial", position: -0.01, inverted: false },
    { axis: "axial", position: 1.01, inverted: false },
    { axis: "axial", position: NaN, inverted: false },
    { axis: "axial", position: Infinity, inverted: false },
    { axis: "oblique", position: 0.5, inverted: false },
    { axis: "coronal", position: "0.5", inverted: false },
    { axis: "sagittal", position: 0.5, inverted: "false" },
    { axis: "sagittal", position: 0.5 },
  ])
    assert.equal(parseAnatomyNativeState({ ...state, section }), undefined);
  assert.equal(parseAnatomyNativeState(state)?.section, undefined);
});

test("malformed bounds, numbers, enum and oversized array messages are rejected", () => {
  for (const patch of [
    { zoom: Infinity },
    { zoom: 0 },
    { height: 119 },
    { opacity: NaN },
    { version: 2 },
    { source: "https://attacker.test" },
    { system: "all" },
    { language: "<script>" },
    { appearance: "external" },
    { selectedId: "javascript:alert(1)" },
    { hiddenIds: Array(ANATOMY_NATIVE_MAX_IDS + 1).fill("FMA13377") },
    { hiddenIds: ["FMA13377", "FMA13377"] },
    { visibleSystems: [] },
    { visibleSystems: ["muscles", "muscles"] },
    { focusRegionKey: -1 },
    { resetKey: 0.5 },
    { focusRegionBounds: { min: [0, 0, 0], max: [-1, 1, 1] } },
    { focusRegionBounds: { min: [0, NaN, 0], max: [1, 1, 1] } },
  ])
    assert.equal(
      parseAnatomyNativeState({ ...state, ...patch }),
      undefined,
      JSON.stringify(patch),
    );
  assert.equal(parseAnatomyNativeState(null), undefined);
});

test("selection callbacks require a current catalogue identity and source", () => {
  assert.deepEqual(
    parseAnatomyNativeEvent(
      { ...envelope, type: "select", id: "FMA13377", token: "not-forwarded" },
      allowed,
      "detailed",
    ),
    { ...envelope, type: "select", id: "FMA13377" },
  );
  assert.equal(
    parseAnatomyNativeEvent(
      { ...envelope, type: "select", id: "FMA_NOT_REAL" },
      allowed,
      "detailed",
    ),
    undefined,
  );
  assert.equal(
    parseAnatomyNativeEvent(
      { ...envelope, type: "select", id: "FMA13377", source: "extended" },
      allowed,
      "detailed",
    ),
    undefined,
  );
  assert.equal(
    parseAnatomyNativeEvent(
      { ...envelope, type: "mounted", source: "extended" },
      allowed,
      "detailed",
    ),
    undefined,
    "late events cannot affect a replacement dataset",
  );
  assert.equal(
    parseAnatomyNativeEvent(
      { ...envelope, channel: "other", type: "select", id: "FMA13377" },
      allowed,
      "detailed",
    ),
    undefined,
  );
});

test("ready callbacks only accept bounded real, unique model IDs", () => {
  const ready = {
    ...envelope,
    type: "ready",
    meshCount: 2,
    structureIds: ["FMA13377", "FMA13378"],
  };
  assert.deepEqual(parseAnatomyNativeEvent(ready, allowed, "detailed"), ready);
  for (const patch of [
    { meshCount: 0 },
    { meshCount: 1 },
    { meshCount: 10001 },
    { structureIds: [] },
    { structureIds: ["FMA13377", "FMA13377"] },
    { structureIds: ["FMA_DOES_NOT_EXIST"] },
  ])
    assert.equal(
      parseAnatomyNativeEvent({ ...ready, ...patch }, allowed, "detailed"),
      undefined,
    );
});

test("errors expose only fixed public codes", () => {
  assert.deepEqual(
    parseAnatomyNativeEvent(
      {
        ...envelope,
        type: "error",
        code: "renderer",
        message: "raw private diagnostic",
      },
      allowed,
      "detailed",
    ),
    { ...envelope, type: "error", code: "renderer" },
  );
  assert.equal(
    parseAnatomyNativeEvent(
      { ...envelope, type: "error", code: "raw private diagnostic" },
      allowed,
      "detailed",
    ),
    undefined,
  );
});

test("only relative public GLBs resolve to the pinned HTTPS model host", () => {
  for (const file of [
    "/anatomy/bodyparts3d-complete/high/fma13377.glb",
    "/anatomy/bodyparts3d/muscles-01.glb",
    "/anatomy/bodyparts3d/details/fma34682-fj1467.glb",
    "/anatomy/bodyparts3d-regional/preview/skeleton-01.glb",
    "/anatomy/bodyparts3d-regional/high/fma13377-fj1234.glb",
  ])
    assert.equal(anatomyNativeAssetUrl(file), ANATOMY_ASSET_ORIGIN + file);
  for (const value of [
    "https://attacker.test/x.glb",
    "/anatomy/z-anatomy/preview/nerves-01.glb",
    "/anatomy/z-anatomy/high/za_0123456789abcdef.glb",
    "//attacker.test/x.glb",
    "file:///secret.glb",
    "/anatomy/bodyparts3d/../secret.glb",
    "/anatomy/bodyparts3d/%2e%2e/secret.glb",
    "/anatomy/bodyparts3d/x.glb?token=secret",
    "/anatomy/bodyparts3d//x.glb",
    "/auth",
    "/anatomy/bodyparts3d/x.js",
    "/anatomy/z-anatomy/../secret.glb",
    "/anatomy/z-anatomy/%2e%2e/secret.glb",
    "/anatomy/z-anatomy/x.glb?token=private",
    "/anatomy/bodyparts3d-regional/../secret.glb",
    "/anatomy/bodyparts3d-regional/%2e%2e/secret.glb",
    "/anatomy/bodyparts3d-regional/high/x.glb?token=private",
    "/anatomy/bodyparts3d-regional/high//x.glb",
    "/anatomy/bodyparts3d-regional/high/x.js",
    "/anatomy/bodyparts3d-regional-other/high/x.glb",
  ])
    assert.equal(anatomyNativeAssetUrl(value), undefined, value);
});
