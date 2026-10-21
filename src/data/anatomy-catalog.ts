import manifestData from "./bodyparts3d-manifest.json";
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
};
export type AtlasStructure = AnatomyStructure & {
  meshIds: readonly string[];
  legacyId?: string;
  sourceName?: string;
  translated: boolean;
  landmark: boolean;
  fmaId?: string;
};
export const anatomyModelManifest = manifestData;
export const anatomyModelMeshes =
  manifestData.meshes as unknown as AnatomyMesh[];
const mappings = manifestData.legacyMapping as Record<string, string[]>;
const quizStructures = new Set(
  [...anatomyQuestions, ...muscleQuestions]
    .map((q) => q.diagram?.structureId)
    .filter(Boolean),
);
const modelSource =
  "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html";

/** Course landmarks stay stable; anatomical mesh identifiers remain independent. */
export const atlasLandmarks: AtlasStructure[] = anatomyStructures.map(
  (entry) => ({
    ...entry,
    meshIds:
      mappings[entry.id] ??
      anatomyModelMeshes
        .filter((mesh) => mesh.legacyIds.includes(entry.id))
        .map((mesh) => mesh.id),
    legacyId: entry.id,
    landmark: true,
    translated: true,
  }),
);

export const atlasMeshStructures: AtlasStructure[] = anatomyModelMeshes.map(
  (mesh) => {
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
  },
);
const byId = new Map(
  [...atlasLandmarks, ...atlasMeshStructures].map((entry) => [entry.id, entry]),
);
export function atlasStructure(id: string | undefined) {
  return id ? byId.get(id) : undefined;
}
export function atlasQuizStructureId(id: string) {
  const legacyId = atlasStructure(id)?.legacyId;
  return legacyId && quizStructures.has(legacyId) ? legacyId : undefined;
}
export function atlasLabel(id: string, language: AnatomyLanguage) {
  return atlasStructure(id)?.name[language] ?? id;
}
export function anatomySearchKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
