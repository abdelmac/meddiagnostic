import type { LocalState } from "./domain/types";
export function isLocalState(value: unknown): value is LocalState {
  if (!value || typeof value !== "object") return false;
  const s = value as LocalState;
  return (
    s.schema === 1 &&
    (s.studyEvents === undefined || (Array.isArray(s.studyEvents) && s.studyEvents.every((event) => typeof event.id === "string" && event.source === "competition" && Number.isFinite(Date.parse(event.at))))) &&
    Array.isArray(s.attempts) &&
    Array.isArray(s.sessions) &&
    Array.isArray(s.favorites) &&
    Array.isArray(s.marked) &&
    Array.isArray(s.reports) &&
    !!s.preferences &&
    Array.isArray(s.preferences.specialties) &&
    !!s.reviews &&
    (s.active === null ||
      (Array.isArray(s.active?.questionIds) && !!s.active.answers)) &&
    s.attempts.every(
      (a) =>
        typeof a.id === "string" &&
        typeof a.questionId === "string" &&
        Number.isInteger(a.choice) &&
        a.choice >= 0 &&
        a.choice < 5 &&
        Number.isFinite(Date.parse(a.at)) &&
        ["fragile", "moyenne", "solide"].includes(a.confidence),
    )
  );
}
