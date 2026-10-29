import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ts from "typescript";
import { atlasCatalog, atlasSourceIds, defaultAtlasSource } from "../src/data/anatomy-catalog";
import { assertBodyPartsOnlyReader } from "../scripts/check-anatomy-publication.mjs";

test("web and native anatomy entry points have no executable import path to historical Z-Anatomy model data", () => {
  const root = path.resolve(".");
  const pending = ["app/anatomy/index.tsx", "src/ui/AnatomyScene.web.tsx", "src/ui/AnatomyScene.tsx", "src/ui/AnatomyScene.dom.tsx"].map(file => path.resolve(file));
  const visited = new Set<string>();
  while (pending.length) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    assert.ok(!path.relative(root, file).startsWith(".."));
    assert.notEqual(path.basename(file), "z-anatomy-manifest.json", "the archived manifest must not enter a new reader bundle");
    const text = fs.readFileSync(file, "utf8");
    assert.equal(/ZA_[a-f0-9]{16}/.test(text), false, `${path.relative(root, file)} must not embed historical model identities`);
    if (file.endsWith(".json")) continue;
    for (const dependency of ts.preProcessFile(text, true, true).importedFiles) {
      if (!dependency.fileName.startsWith(".")) continue;
      const base = path.resolve(path.dirname(file), dependency.fileName);
      const candidates = [base, ...[".ts", ".tsx", ".web.ts", ".web.tsx", ".native.ts", ".native.tsx", ".json", "/index.ts", "/index.tsx"].map(extension => base + extension)];
      for (const candidate of candidates) if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) pending.push(candidate);
    }
  }
  assert.ok(visited.size > 20, "the check must traverse the actual reader dependency graph");
  for (const file of ["bodyparts3d-regional-manifest.json", "bodyparts3d-manifest.json", "bodyparts3d-complete-manifest.json"]) assert.ok(visited.has(path.resolve("src/data", file)));
  assert.deepEqual(atlasSourceIds, ["regional", "extended", "detailed"]);
  assert.equal(defaultAtlasSource, "regional");
  for (const source of atlasSourceIds) {
    const catalog = atlasCatalog(source);
    assert.match(catalog.manifest.datasetId!, /^bodyparts3d-/);
    for (const system of catalog.manifest.systems) for (const file of system.files) assert.match(file, /^\/anatomy\/bodyparts3d(?:-regional|-complete)?\//);
    for (const mesh of catalog.meshes) for (const file of mesh.lod?.files ?? []) assert.match(file, /^\/anatomy\/bodyparts3d(?:-regional|-complete)?\//);
  }
});

function publicationFixture(run: (root: string, policy: { currentSources: { id: string; datasetId: string; manifest: string; assetPrefix: string }[]; legacyZAnatomy: { sourceUrl: string } }) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ippomed-bodyparts-publication-"));
  const write = (file: string, data: string | Buffer) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
  };
  try {
    const policy = JSON.parse(fs.readFileSync("config/anatomy-distribution.json", "utf8"));
    write("config/anatomy-distribution.json", JSON.stringify(policy));
    for (const source of policy.currentSources) write(source.manifest, JSON.stringify({
      datasetId: source.datasetId, status: "ready", systems: [{ id: "nerves", files: [`${source.assetPrefix}preview/nerves-01.glb`] }],
      meshes: [{ id: "FMA58727_MM2242", lod: { files: [`${source.assetPrefix}high/fma58727_mm2242.glb`] } }],
    }));
    write("src/reader.ts", "export const reference = 'BodyParts3D';");
    write("app/anatomy/index.tsx", "export const screen = 'Anatomy';");
    write("dist/_expo/static/js/web/reader.js", "globalThis.modelId = 'FMA58727_MM2242';");
    write("dist-native/android/reader.hbc", Buffer.from([0x1f, 0x19, 0x03, 0xc1, ...Buffer.from("FMA58727_MM2242")]));
    write("public/anatomy/z-anatomy/manifest.json", JSON.stringify({ publicationStatus: "approved", publicationBasis: { sourceCodeUrl: policy.legacyZAnatomy.sourceUrl } }));
    run(root, policy);
  } finally {
    const resolved = fs.realpathSync(root), temporary = fs.realpathSync(os.tmpdir());
    assert.ok(resolved.startsWith(temporary + path.sep));
    assert.ok(path.basename(resolved).startsWith("ippomed-bodyparts-publication-"));
    fs.rmSync(resolved, { recursive: true });
  }
}

test("publication accepts BodyParts3D web and native payloads while retaining separately licensed historical assets", () => publicationFixture(root => {
  const checked = assertBodyPartsOnlyReader({ root, bundleRoots: ["dist/_expo/static/js", "dist-native/android"] });
  assert.deepEqual(checked.currentSources, ["regional", "extended", "detailed"]);
  assert.equal(checked.bundleFiles, 2);
  assert.equal(checked.legacyAssetsRetained, true);
  fs.unlinkSync(path.join(root, "public/anatomy/z-anatomy/manifest.json"));
  const nativeOnly = assertBodyPartsOnlyReader({ root, bundleRoots: ["dist-native/android"] });
  assert.equal(nativeOnly.legacyAssetsRetained, false, "a native/source-only export can use remotely hosted historical assets without packaging them");
  assert.equal(nativeOnly.bundleFiles, 1);
}));

test("publication rejects new historical-model imports and literal or JSON-escaped model requests", () => publicationFixture(root => {
  for (const payload of [
    "import legacy from './data/z-anatomy-manifest.json';",
    "export const model='/anatomy/z-anatomy/high/za_model.glb';",
    String.raw`export const model="\/anatomy\/z-anatomy\/preview\/nerves-01.glb";`,
  ]) {
    fs.writeFileSync(path.join(root, "src/reader.ts"), payload);
    assert.throws(() => assertBodyPartsOnlyReader({ root }), /historical Z-Anatomy model/);
  }
}));

test("publication scans built JavaScript and native binary string tables and refuses missing bundle outputs", () => publicationFixture(root => {
  for (const file of ["dist/_expo/static/js/web/reader.js", "dist-native/android/reader.hbc"]) {
    const original = fs.readFileSync(path.join(root, file));
    for (const payload of ["ZA_0123456789abcdef", String.raw`\/anatomy\/z-anatomy\/high\/model.glb`, "'../data/z-anatomy-manifest.json'"]) {
      fs.writeFileSync(path.join(root, file), Buffer.concat([Buffer.from([0x1f, 0xff, 0x00]), Buffer.from(payload)]));
      assert.throws(() => assertBodyPartsOnlyReader({ root, bundleRoots: [file.includes("dist-native") ? "dist-native/android" : "dist/_expo/static/js"] }), /bundle still includes Z-Anatomy model data/);
    }
    fs.writeFileSync(path.join(root, file), original);
  }
  assert.throws(() => assertBodyPartsOnlyReader({ root, bundleRoots: ["nonexistent-output"] }), /No built anatomy-reader code/);
}));

test("a manifest cannot reintroduce historical model assets through a changed prefix or URL traversal", () => publicationFixture((root, policy) => {
  const source = policy.currentSources[0]!;
  const original = JSON.parse(fs.readFileSync(path.join(root, source.manifest), "utf8"));
  for (const url of [
    `${source.assetPrefix}../z-anatomy/high/model.glb`,
    `${source.assetPrefix}%2e%2e/z-anatomy/high/model.glb`,
    `${source.assetPrefix}high/model.glb?redirect=/anatomy/z-anatomy/high/model.glb`,
  ]) {
    const next = structuredClone(original);
    next.meshes[0].lod.files = [url];
    fs.writeFileSync(path.join(root, source.manifest), JSON.stringify(next));
    assert.throws(() => assertBodyPartsOnlyReader({ root }), /BodyParts3D|anatomy|asset|reference/i);
  }
  source.assetPrefix = "/anatomy/z-anatomy/";
  fs.writeFileSync(path.join(root, "config/anatomy-distribution.json"), JSON.stringify(policy));
  fs.writeFileSync(path.join(root, source.manifest), JSON.stringify({ ...original, systems: [{ id: "nerves", files: [source.assetPrefix + "preview/nerves-01.glb"] }], meshes: [{ id: "FMA58727_MM2242", lod: { files: [source.assetPrefix + "high/model.glb"] } }] }));
  assert.throws(() => assertBodyPartsOnlyReader({ root }), /BodyParts3D|anatomy|asset|reference/i);
}));

test("retaining historical assets cannot silently remove their approved source continuity", () => publicationFixture(root => {
  fs.writeFileSync(path.join(root, "public/anatomy/z-anatomy/manifest.json"), JSON.stringify({ publicationStatus: "approved", publicationBasis: { sourceCodeUrl: "https://example.test/private-code" } }));
  assert.throws(() => assertBodyPartsOnlyReader({ root }), /approved historical source reference/);
}));
