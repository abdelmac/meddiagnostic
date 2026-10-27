/** Visibility-only history: these actions never move anatomy or the camera. */
export type AnatomyDissection = {
  hiddenIds: string[];
  history: string[][];
};

export type AnatomyDissectionAction =
  | { type: "set"; ids: string[] | ((current: string[]) => string[]) }
  | { type: "toggle"; ids: readonly string[] }
  | { type: "undo" }
  | { type: "restore" };

export const emptyAnatomyDissection = (): AnatomyDissection => ({
  hiddenIds: [],
  history: [],
});

export function anatomyDissectionReducer(
  state: AnatomyDissection,
  action: AnatomyDissectionAction,
): AnatomyDissection {
  if (action.type === "restore")
    return state.hiddenIds.length || state.history.length
      ? emptyAnatomyDissection()
      : state;
  if (action.type === "undo") {
    const previous = state.history.at(-1);
    return previous
      ? {
          hiddenIds: state.hiddenIds.filter((id) => !previous.includes(id)),
          history: state.history.slice(0, -1),
        }
      : state;
  }
  if (action.type === "set") {
    const ids = [
      ...new Set(
        typeof action.ids === "function"
          ? action.ids(state.hiddenIds)
          : action.ids,
      ),
    ];
    if (
      ids.length === state.hiddenIds.length &&
      ids.every((id, index) => id === state.hiddenIds[index])
    )
      return state;
    // Revealing a search result or changing reference starts a fresh history.
    return { hiddenIds: ids, history: [] };
  }
  const selected = [...new Set(action.ids)];
  if (!selected.length) return state;
  const hidden = new Set(state.hiddenIds);
  const reveal = selected.every((id) => hidden.has(id));
  const newlyHidden = selected.filter((id) => !hidden.has(id));
  for (const id of selected) reveal ? hidden.delete(id) : hidden.add(id);
  return {
    hiddenIds: [...hidden],
    history: reveal
      ? state.history
          .map((group) => group.filter((id) => !selected.includes(id)))
          .filter((group) => group.length)
      : [...state.history.slice(-31), newlyHidden],
  };
}
