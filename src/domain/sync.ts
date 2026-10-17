import type { LocalState } from "./types";
import { initialState, nextReview, uid } from "./engine";
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function metadata(state: LocalState) {
  return state.syncMeta ?? { actor: uid(), clock: 0, fields: {} };
}
export function captureChanges(
  previous: LocalState,
  next: LocalState,
): LocalState {
  const meta = metadata(previous);
  const fields = { ...meta.fields };
  let clock = meta.clock;
  const record = (key: string, value: unknown) => {
    fields[key] = { clock: ++clock, actor: meta.actor, value };
  };
  for (const group of ["favorites", "marked"] as const) {
    for (const id of new Set([...previous[group], ...next[group]])) {
      if (
        previous[group].includes(id) !== next[group].includes(id) ||
        !fields[`${group}:${id}`]
      )
        record(`${group}:${id}`, next[group].includes(id));
    }
  }
  for (const key of Object.keys(
    next.preferences,
  ) as (keyof LocalState["preferences"])[]) {
    if (
      !equal(previous.preferences[key], next.preferences[key]) ||
      (!fields[`preference:${key}`] &&
        !equal(next.preferences[key], initialState.preferences[key]))
    )
      record(`preference:${key}`, next.preferences[key]);
  }
  return { ...next, syncMeta: { ...meta, clock, fields } };
}
export function prepareSnapshot(state: LocalState) {
  const prepared = captureChanges(state, state);
  return { ...prepared, active: null };
}
export function mergeProgress(
  local: LocalState,
  remote: LocalState,
): LocalState {
  const left = captureChanges(local, local);
  const a = left.syncMeta!;
  const b = remote.syncMeta ?? { clock: 0, fields: {} };
  const fields = { ...a.fields };
  for (const [key, right] of Object.entries(b.fields)) {
    const l = fields[key];
    if (
      !l ||
      right.clock > l.clock ||
      (right.clock === l.clock && right.actor > l.actor)
    )
      fields[key] = right;
  }
  const attempts = [
    ...new Map(
      [...remote.attempts, ...local.attempts].map((item) => [
        item.id,
        { ...item },
      ]),
    ).values(),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const reviews: LocalState["reviews"] = {};
  for (const a of attempts) {
    a.repeated = seen.has(a.questionId);
    seen.add(a.questionId);
    reviews[a.questionId] = nextReview(
      reviews[a.questionId],
      a.correct,
      a.confidence,
      new Date(a.at),
      a.questionId,
    );
  }
  const sessions = [
    ...new Map(
      [...remote.sessions, ...local.sessions]
        .sort((a, b) => (a.finishedAt ?? "").localeCompare(b.finishedAt ?? ""))
        .map((s) => [s.id, s]),
    ).values(),
  ].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const reports = [
    ...new Map(
      [...remote.reports, ...local.reports].map((r) => [r.id, r]),
    ).values(),
  ];
  const result: LocalState = {
    ...local,
    attempts,
    reviews,
    sessions,
    reports,
    syncMeta: { actor: a.actor, clock: Math.max(a.clock, b.clock), fields },
    favorites: [],
    marked: [],
    preferences: { ...initialState.preferences, ...local.preferences },
  };
  for (const [key, field] of Object.entries(fields)) {
    const [group, ...rest] = key.split(":");
    const id = rest.join(":");
    if ((group === "favorites" || group === "marked") && field.value === true)
      result[group].push(id);
    if (group === "preference" && id in result.preferences)
      (result.preferences as Record<string, unknown>)[id] = field.value;
  }
  result.favorites.sort();
  result.marked.sort();
  return result;
}
