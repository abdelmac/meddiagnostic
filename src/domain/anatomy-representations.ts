type RepresentationEntry = {
  id: string;
  representationGroup?: string;
  representationDefault?: boolean;
};

/** Source alternatives remain selectable, but never overlap in the body.
 * Preferred physical IDs are persisted by the study state, independently of
 * the current selection and dissection. A course landmark may match several
 * alternatives; retain the learner's preferred version in that case.
 */
export function anatomyRepresentationChoices(
  entries: readonly RepresentationEntry[],
  selectedIds: ReadonlySet<string>,
  preferredIds: ReadonlySet<string> = new Set(),
): Map<string, string> {
  const groups = new Map<string, RepresentationEntry[]>();
  for (const entry of entries) {
    if (!entry.representationGroup) continue;
    const group = groups.get(entry.representationGroup) ?? [];
    group.push(entry);
    groups.set(entry.representationGroup, group);
  }
  const choices = new Map<string, string>();
  for (const [id, alternatives] of groups) {
    const selected = alternatives.filter(entry => selectedIds.has(entry.id));
    const candidates = selected.length ? selected : alternatives;
    const chosen = candidates.find(entry => preferredIds.has(entry.id))
      ?? candidates.find(entry => entry.representationDefault)
      ?? candidates.reduce((first, entry) => entry.id.localeCompare(first.id) < 0 ? entry : first);
    choices.set(id, chosen.id);
  }
  return choices;
}
