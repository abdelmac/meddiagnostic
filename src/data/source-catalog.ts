import catalog from "./source-catalog.json";

export const sourceCatalog = catalog;
export type SourceRecord = (typeof catalog.sources)[number];
export function searchSources(query: string, format = "all"): SourceRecord[] {
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return catalog.sources.filter(
    (source) =>
      (format === "all" || source.format === format) &&
      words.every((word) =>
        normalize(`${source.title} ${source.collection} ${source.format}`).includes(word),
      ),
  );
}
export const getSource = (id: string) =>
  catalog.sources.find((source) => source.id === id);
