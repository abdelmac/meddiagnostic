import manifestData from "./bodyparts3d-manifest.json";
import completeManifestData from "./bodyparts3d-complete-manifest.json";
import neurovascularManifestData from "./z-anatomy-manifest.json";
import regionalManifestData from "./bodyparts3d-regional-manifest.json";
import {
  anatomyStructure,
  anatomyStructures,
  anatomySystem,
  type AnatomyStructure,
  type AnatomySystem,
  type AnatomyLanguage,
} from "./anatomy-structures";
import {
  anatomyNameHasFrench,
  localizeAnatomyName,
} from "./anatomy-nomenclature";
import { anatomyQuestions } from "./anatomy-questions";
import { muscleQuestions } from "./muscle-questions";

export type AnatomyVascularKind = "artery" | "vein" | "other";
export type AnatomyVascularFilter = "all" | "artery" | "vein";
export type AnatomyQuickView = "nerves" | "arteries" | "veins" | "bones";
export const anatomyQuickViews = [
  {
    id: "nerves",
    system: "nerves",
    name: { fr: "Nerfs", en: "Nerves" },
    vascularFilter: "all",
  },
  {
    id: "arteries",
    system: "vessels",
    name: { fr: "Artères", en: "Arteries" },
    vascularFilter: "artery",
  },
  {
    id: "veins",
    system: "vessels",
    name: { fr: "Veines", en: "Veins" },
    vascularFilter: "vein",
  },
  {
    id: "bones",
    system: "skeleton",
    name: { fr: "Os", en: "Bones" },
    vascularFilter: "all",
  },
] as const;

export type AnatomyMesh = {
  id: string;
  fmaId?: string;
  /** Exact source concept, including the author's explicit lateral extensions. */
  sourceConceptId?: string;
  elementId: string;
  representationId: string;
  representationGroup?: string;
  representationDefault?: boolean;
  name: string;
  source?: { originalName?: string };
  system: AnatomySystem;
  legacyIds: string[];
  bounds?: { min: number[]; max: number[] };
  defaultVisible?: boolean;
  /** Assigned by the source ontology; never inferred from display colour. */
  vascularKind?: AnatomyVascularKind;
  lod?: {
    url?: string;
    files?: string[];
    bytes: number;
    triangles: number;
    vertexCount: number;
  };
};
export const atlasSourceIds = ["comprehensive", "extended", "detailed", "regional"] as const;
export type AtlasSource = (typeof atlasSourceIds)[number];
export const atlasSources = {
  comprehensive: {
    name: { fr: "Atlas neurovasculaire", en: "Neurovascular atlas" },
    description: {
      fr: "Nerfs et réseaux vasculaires dans une référence anatomique distincte. La couverture dépend des modèles réellement disponibles.",
      en: "Nerves and vascular networks within a separate anatomical reference. Coverage depends on the models actually available.",
    },
    networks: true,
  },
  extended: {
    name: { fr: "Corps complet", en: "Whole body" },
    description: {
      fr: "Nerfs, artères, veines et formes osseuses dans la référence BodyParts3D 4.3, avec ses limites de couverture.",
      en: "Nerves, arteries, veins and bone shapes within the BodyParts3D 4.3 reference, with its coverage limits.",
    },
    networks: true,
  },
  detailed: {
    name: { fr: "Corps détaillé", en: "Detailed body" },
    description: {
      fr: "Reliefs détaillés BodyParts3D 3.0, chargés progressivement dans leur propre corps.",
      en: "Detailed BodyParts3D 3.0 surfaces, loaded progressively within their own body.",
    },
    networks: false,
  },
  regional: {
    name: { fr: "Anatomie régionale", en: "Regional anatomy" },
    description: {
      fr: "Détails régionaux BodyParts3D 2018 (5.3), chargés progressivement dans un corps séparé des autres références.",
      en: "BodyParts3D 2018 (5.3) regional details, loaded progressively within a body separate from the other references.",
    },
    networks: true,
  },
} as const;
export type AtlasManifest = {
  status?: string;
  publicationStatus?: string;
  datasetId?: string;
  dataset: string;
  source: string;
  attributionUrl?: string;
  attribution: string;
  systems: {
    id: AnatomySystem;
    files: string[];
    bytes: number;
    meshCount: number;
    triangles: number;
  }[];
  meshes: AnatomyMesh[];
  legacyMapping: Record<string, string[]>;
  bounds: { min: number[]; max: number[] };
  detailExpansion?: {
    baselineDatasets: string[];
    newMeshIds: string[];
    newConceptIds: string[];
    excludedUnmappedCount: number;
    definition: string;
  };
  isolatedDetails?: {
    dataset: string;
    license: string;
    entries: {
      id: string;
      sourceFmaId?: string;
      url: string;
      bytes: number;
      triangles?: number;
      vertexCount?: number;
      bounds?: { min: number[]; max: number[] };
    }[];
  };
};
export type AtlasStructure = AnatomyStructure & {
  meshIds: readonly string[];
  legacyId?: string;
  sourceName?: string;
  translated: boolean;
  landmark: boolean;
  fmaId?: string;
  vascularKind?: AnatomyVascularKind;
  representationGroup?: string;
  representationDefault?: boolean;
};

/** Only blood vessels are filtered; skeletal context remains available. */
export function anatomyExcludedVesselIds(
  meshes: readonly AnatomyMesh[],
  filter: AnatomyVascularFilter,
): string[] {
  return filter === "all"
    ? []
    : meshes
        .filter(
          (mesh) => mesh.system === "vessels" && mesh.vascularKind !== filter,
        )
        .map((mesh) => mesh.id);
}
const quizStructures = new Set(
  [...anatomyQuestions, ...muscleQuestions]
    .map((q) => q.diagram?.structureId)
    .filter(Boolean),
);
export function createAtlasCatalog(data: unknown) {
  const manifest = data as AtlasManifest;
  const meshes: AnatomyMesh[] = manifest.meshes.map((mesh) => ({
    ...mesh,
    fmaId: /^FMA\d+$/.test(mesh.fmaId ?? "")
      ? mesh.fmaId : mesh.id.match(/^FMA\d+(?=_|$)/)?.[0],
    elementId: mesh.elementId ?? mesh.id,
    representationId: mesh.representationId ?? mesh.id,
  }));
  const mappings = manifest.legacyMapping;
  const byMeshId = new Map(meshes.map((mesh) => [mesh.id, mesh]));
  const vascularKindFor = (ids: readonly string[]) => {
    const first = ids.length ? byMeshId.get(ids[0]!)?.vascularKind : undefined;
    return first && ids.every((id) => byMeshId.get(id)?.vascularKind === first)
      ? first
      : undefined;
  };
  const modelSource = manifest.source.endsWith(".zip")
    ? manifest.source.replace(/[^/]+\.zip$/, "README_e.html")
    : manifest.source;

  /** Course landmarks stay stable; anatomical mesh identifiers remain independent. */
  const landmarks: AtlasStructure[] = anatomyStructures.map((entry) => {
    const meshIds =
      mappings[entry.id] ??
      meshes
        .filter((mesh) => mesh.legacyIds.includes(entry.id))
        .map((mesh) => mesh.id);
    return {
      ...entry,
      meshIds,
      vascularKind: vascularKindFor(meshIds),
      legacyId: entry.id,
      landmark: true,
      translated: true,
    };
  });

  const structures: AtlasStructure[] = meshes.map((mesh) => {
    const legacyId = mesh.legacyIds.find((id) => anatomyStructure(id));
    const notes = legacyId ? anatomyStructure(legacyId) : undefined;
    const system = anatomySystem(mesh.system);
    return {
      id: mesh.id,
      system: mesh.system,
      name: { fr: localizeAnatomyName(mesh.name, "fr"), en: mesh.name },
      region: notes?.region ?? system.name,
      summary: notes?.summary ?? {
        fr: `Structure identifiée dans la référence ${manifest.dataset}. Explorez sa forme et ses rapports avec les structures voisines.`,
        en: `Identified structure from the ${manifest.dataset} reference. Explore its shape and relationships with neighbouring structures.`,
      },
      views: ["anterior", "posterior"],
      sources: notes?.sources ?? [modelSource],
      meshIds: [mesh.id],
      legacyId,
      sourceName: mesh.source?.originalName ?? mesh.name,
      translated: anatomyNameHasFrench(mesh.name),
      landmark: false,
      fmaId: mesh.fmaId,
      vascularKind: mesh.vascularKind,
      representationGroup: mesh.representationGroup,
      representationDefault: mesh.representationDefault,
    };
  });
  const byId = new Map(
    [...landmarks, ...structures].map((entry) => [entry.id, entry]),
  );
  function structure(id: string | undefined) {
    return id ? byId.get(id) : undefined;
  }
  function quizStructureId(id: string) {
    const legacyId = structure(id)?.legacyId;
    return legacyId && quizStructures.has(legacyId) ? legacyId : undefined;
  }
  return {
    manifest,
    meshes,
    landmarks,
    structures,
    structure,
    quizStructureId,
  };
}
const catalogs = {
  comprehensive: createAtlasCatalog(neurovascularManifestData),
  detailed: createAtlasCatalog(completeManifestData),
  extended: createAtlasCatalog(manifestData),
  regional: createAtlasCatalog(regionalManifestData),
};
export const atlasCatalog = (source: AtlasSource) => catalogs[source];
/** Publication-pending data can only be exposed by an explicit local build. */
export function anatomySourceAvailable(
  manifest: Pick<AtlasManifest, "status" | "publicationStatus" | "meshes">,
  options: { privatePreview?: boolean } = {},
) {
  return manifest.status === "ready" && manifest.meshes.length > 0
    && (manifest.publicationStatus === undefined || manifest.publicationStatus === "approved"
      || (manifest.publicationStatus === "private-preview-pending-approval" && options.privatePreview === true));
}
export const atlasSourceAvailable = (source: AtlasSource) =>
  anatomySourceAvailable(catalogs[source].manifest, {
    privatePreview: process.env.EXPO_PUBLIC_Z_ANATOMY_PRIVATE_PREVIEW === "1",
  });
export const defaultNetworkSource: AtlasSource = atlasSourceAvailable("comprehensive")
  ? "comprehensive" : "extended";
export const defaultAtlasSource = defaultNetworkSource;
// Compatibility for consumers of the original extended atlas.
export const anatomyModelManifest = catalogs.extended.manifest;
export const anatomyModelMeshes = catalogs.extended.meshes;
export const atlasLandmarks = catalogs.extended.landmarks;
export const atlasMeshStructures = catalogs.extended.structures;
export const atlasStructure = catalogs.extended.structure;
export const atlasQuizStructureId = catalogs.extended.quizStructureId;
export function atlasLabel(id: string, language: AnatomyLanguage) {
  return atlasStructure(id)?.name[language] ?? id;
}
export function anatomySearchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
