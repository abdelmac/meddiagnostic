import manifestData from "./bodyparts3d-manifest.json";
import completeManifestData from "./bodyparts3d-complete-manifest.json";
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

export type AnatomyMesh = {
  id: string;
  fmaId: string;
  elementId: string;
  representationId: string;
  name: string;
  system: AnatomySystem;
  legacyIds: string[];
  bounds?: { min: number[]; max: number[] };
  defaultVisible?: boolean;
  lod?: {
    url?: string;
    files?: string[];
    bytes: number;
    triangles: number;
    vertexCount: number;
  };
};
export type AtlasSource = "detailed" | "extended";
export type AtlasManifest = {
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
};
const quizStructures = new Set(
  [...anatomyQuestions, ...muscleQuestions]
    .map((q) => q.diagram?.structureId)
    .filter(Boolean),
);
function makeCatalog(data: unknown) {
  const manifest = data as AtlasManifest;
  const meshes: AnatomyMesh[] = manifest.meshes.map((mesh) => ({
    ...mesh,
    fmaId: mesh.fmaId ?? mesh.id.match(/^FMA\d+/)?.[0] ?? mesh.id,
    elementId: mesh.elementId ?? mesh.id,
    representationId: mesh.representationId ?? mesh.id,
  }));
  const mappings = manifest.legacyMapping;
  const modelSource = manifest.source.endsWith(".zip")
    ? manifest.source.replace(/[^/]+\.zip$/, "README_e.html")
    : manifest.source;

  /** Course landmarks stay stable; anatomical mesh identifiers remain independent. */
  const landmarks: AtlasStructure[] = anatomyStructures.map((entry) => ({
    ...entry,
    meshIds:
      mappings[entry.id] ??
      meshes
        .filter((mesh) => mesh.legacyIds.includes(entry.id))
        .map((mesh) => mesh.id),
    legacyId: entry.id,
    landmark: true,
    translated: true,
  }));

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
        fr: "Structure identifiée dans le jeu de données anatomiques BodyParts3D. Explorez sa forme et ses rapports avec les structures voisines.",
        en: "Identified structure from the BodyParts3D anatomical dataset. Explore its shape and relationships with neighbouring structures.",
      },
      views: ["anterior", "posterior"],
      sources: notes?.sources ?? [modelSource],
      meshIds: [mesh.id],
      legacyId,
      sourceName: mesh.name,
      translated: anatomyNameHasFrench(mesh.name),
      landmark: false,
      fmaId: mesh.fmaId,
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
  detailed: makeCatalog(completeManifestData),
  extended: makeCatalog(manifestData),
};
export const atlasCatalog = (source: AtlasSource) => catalogs[source];
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
