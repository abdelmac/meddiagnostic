import test from "node:test";
import assert from "node:assert/strict";
import { atlasCatalog, atlasSourceIds, createAtlasCatalog, anatomyModelManifest, anatomySourceAvailable } from "../src/data/anatomy-catalog";

test("catalogues preserve old source identities while exposing an independent third reference", () => {
  assert.deepEqual(atlasSourceIds, ["comprehensive", "extended", "detailed"]);
  assert.equal(atlasCatalog("extended").manifest, anatomyModelManifest);
  assert.equal(atlasCatalog("extended").manifest.datasetId, "bodyparts3d-4.3");
  assert.equal(atlasCatalog("detailed").manifest.datasetId, "bodyparts3d-3.0-95");
  assert.equal(atlasCatalog("comprehensive").manifest.datasetId, "z-anatomy-neurovascular");
});

test("publication-pending data stays unavailable except in an explicit private preview", () => {
  const pending = { status: "ready", publicationStatus: "private-preview-pending-approval", meshes: [{ id: "ZA_0123456789abcdef" }] } as Parameters<typeof anatomySourceAvailable>[0];
  assert.equal(anatomySourceAvailable(pending), false);
  assert.equal(anatomySourceAvailable(pending, { privatePreview: false }), false);
  assert.equal(anatomySourceAvailable(pending, { privatePreview: true }), true);
  assert.equal(anatomySourceAvailable({ ...pending, status: "preparing" }, { privatePreview: true }), false);
  assert.equal(anatomySourceAvailable({ ...pending, meshes: [] }, { privatePreview: true }), false);
  assert.equal(anatomySourceAvailable({ ...pending, publicationStatus: "approved" }), true);
  assert.equal(anatomySourceAvailable({ ...pending, publicationStatus: "unreviewed" }), false);
  assert.equal(anatomySourceAvailable({ ...pending, publicationStatus: "rejected" }, { privatePreview: true }), false);
  assert.equal(anatomySourceAvailable(atlasCatalog("extended").manifest), true);
  assert.equal(anatomySourceAvailable(atlasCatalog("detailed").manifest), true);
});

test("source object IDs never become invented FMA identifiers or BodyParts3D attributions", () => {
  const catalog = createAtlasCatalog({
    dataset: "Independent anatomical reference",
    source: "https://example.test/authoritative-source",
    attribution: "Source author",
    systems: [],
    bounds: { min: [-0.5, 0, -0.25], max: [0.5, 1.8, 0.25] },
    legacyMapping: {},
    meshes: [
      { id: "ZA_0123456789abcdef", name: "Left sciatic nerve", system: "nerves", legacyIds: ["sciatic-nerve"], source: { originalName: "Nervus ischiadicus sinister" } },
      { id: "ZA_fedcba9876543210", fmaId: "ZA_fedcba9876543210", name: "Unmapped source component", system: "nerves", legacyIds: [] },
      { id: "ZA_0011223344556677", fmaId: "FMA5547", name: "Source component with an explicit FMA", system: "nerves", legacyIds: [] },
    ],
  });
  assert.equal(catalog.structure("ZA_0123456789abcdef")?.fmaId, undefined);
  assert.equal(catalog.structure("ZA_0123456789abcdef")?.sourceName, "Nervus ischiadicus sinister");
  assert.deepEqual(catalog.structure("sciatic-nerve")?.meshIds, ["ZA_0123456789abcdef"]);
  assert.equal(catalog.structure("ZA_fedcba9876543210")?.fmaId, undefined);
  assert.equal(catalog.structure("ZA_0011223344556677")?.fmaId, "FMA5547");
  const summary = catalog.structure("ZA_fedcba9876543210")!.summary;
  assert.match(summary.fr, /Independent anatomical reference/);
  assert.match(summary.en, /Independent anatomical reference/);
  assert.ok(!summary.fr.includes("BodyParts3D"));
});
