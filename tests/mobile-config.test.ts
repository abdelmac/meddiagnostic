import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("EAS mobile profiles use the small native public folder and correct outputs", () => {
  const eas = JSON.parse(fs.readFileSync("eas.json", "utf8"));
  for (const name of ["development", "preview", "production"])
    assert.equal(eas.build[name].env.EXPO_PUBLIC_FOLDER, "public-native");
  assert(fs.existsSync("public-native/NOTICE.txt"));
  assert.equal(eas.build.preview.android.buildType, "apk");
  assert.equal(eas.build.preview.ios.simulator, true);
  assert.equal(eas.build.production.android.buildType, "app-bundle");
  assert.equal(eas.build.production.distribution, "store");
  assert.equal(eas.build.production.ios.simulator, false);
});

test("EAS uploads preserve every existing secret and cache exclusion", () => {
  const patterns = (file: string) =>
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  const eas = new Set(patterns(".easignore"));
  for (const rule of patterns(".gitignore"))
    assert(eas.has(rule), `Missing EAS exclusion: ${rule}`);
  for (const rule of [
    "public/anatomy/",
    "artifacts/",
    ".local/",
    ".env.*",
    "!.env.example",
  ])
    assert(eas.has(rule));
});
