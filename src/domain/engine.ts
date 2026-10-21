import type {
  Attempt,
  Confidence,
  LocalState,
  Question,
  Review,
  Session,
  Specialty,
  AnatomyFocus,
} from "./types";

export const initialState: LocalState = {
  schema: 1,
  studyEvents: [],
  attempts: [],
  reviews: {},
  favorites: [],
  marked: [],
  sessions: [],
  active: null,
  reports: [],
  preferences: {
    level: "Début de clinique",
    specialties: ["dermatologie", "cardiologie", "pneumologie"],
    dailyGoal: 5,
    dark: false,
    largeText: false,
    reminder: false,
  },
};
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function nextReview(
  previous: Review | undefined,
  correct: boolean,
  confidence: Confidence,
  now: Date,
  questionId: string,
): Review {
  const streak = correct ? (previous?.streak ?? 0) + 1 : 0;
  const interval =
    !correct || confidence === "fragile"
      ? 1
      : confidence === "moyenne"
        ? Math.min(14, Math.max(2, (previous?.interval ?? 1) * 2))
        : Math.min(60, Math.max(4, (previous?.interval ?? 1) * 3));
  return {
    questionId,
    streak,
    interval,
    due: new Date(now.getTime() + interval * 86_400_000).toISOString(),
  };
}
export function dueIds(state: LocalState, now = new Date()) {
  return [
    ...new Set([
      ...Object.values(state.reviews)
        .filter((r) => Date.parse(r.due) <= now.getTime())
        .sort((a, b) => a.due.localeCompare(b.due))
        .map((r) => r.questionId),
      ...state.marked,
    ]),
  ];
}
export function createSession(
  questions: Question[],
  config: {
    specialties: Specialty[];
    difficulty: string;
    type: string;
    count: number;
    mode: Session["mode"];
    timerMinutes: number | null;
    studyYear?: number;
    anatomyFocus?: AnatomyFocus;
    structureId?: string;
    ids?: string[];
    kind?: Session["kind"];
  },
  random = Math.random,
): Session {
  const pool = questions.filter(
    (q) =>
      q.status === "demo" &&
      config.specialties.includes(q.specialty) &&
      (config.difficulty === "toutes" || q.difficulty === config.difficulty) &&
      (config.type === "tous" || q.type === config.type) &&
      (!config.studyYear || !q.studyYears || q.studyYears.includes(config.studyYear)) &&
      (!config.anatomyFocus || q.anatomyFocus === config.anatomyFocus) &&
      (!config.structureId || q.diagram?.structureId === config.structureId) &&
      (!config.ids || config.ids.includes(q.id)),
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  if (!pool.length)
    throw new Error("Aucune question disponible avec ces filtres.");
  return {
    id: uid(),
    questionIds: pool.slice(0, config.count).map((q) => q.id),
    index: 0,
    answers: {},
    mode: config.mode,
    startedAt: new Date().toISOString(),
    timerMinutes: config.timerMinutes,
    kind: config.kind ?? "quiz",
    ...(config.studyYear ? { studyYear: config.studyYear } : {}),
  };
}
export function recordAnswer(
  state: LocalState,
  question: Question,
  choice: number,
  confidence: Confidence,
  now = new Date(),
): LocalState {
  const session = state.active;
  if (
    !session ||
    session.questionIds[session.index] !== question.id ||
    session.answers[question.id]
  )
    return state;
  if (!question.options[choice]) throw new Error("Réponse invalide");
  const correct = choice === question.correct;
  const attempt: Attempt = {
    id: `${session.id}:${question.id}:${question.version}`,
    sessionId: session.id,
    questionId: question.id,
    version: question.version,
    choice,
    confidence,
    correct,
    at: now.toISOString(),
    repeated: state.attempts.some((a) => a.questionId === question.id),
  };
  return {
    ...state,
    attempts: [...state.attempts, attempt],
    reviews: {
      ...state.reviews,
      [question.id]: nextReview(
        state.reviews[question.id],
        correct,
        confidence,
        now,
        question.id,
      ),
    },
    marked: state.marked.filter((id) => id !== question.id),
    active: {
      ...session,
      answers: { ...session.answers, [question.id]: { choice, confidence } },
    },
  };
}
export function finishSession(state: LocalState, now = new Date()): LocalState {
  if (!state.active) return state;
  const session = { ...state.active, finishedAt: now.toISOString() };
  return {
    ...state,
    active: null,
    sessions: [...state.sessions.filter((s) => s.id !== session.id), session],
  };
}
export function score(session: Session, questions: Question[]) {
  return session.questionIds.reduce(
    (sum, id) =>
      sum +
      Number(
        session.answers[id]?.choice ===
          questions.find((q) => q.id === id)?.correct,
      ),
    0,
  );
}
export function accuracy(attempts: Attempt[]) {
  return attempts.length
    ? Math.round(
        (100 * attempts.filter((a) => a.correct).length) / attempts.length,
      )
    : 0;
}
export function mergeAttempts(local: Attempt[], remote: Attempt[]) {
  return [...new Map([...remote, ...local].map((a) => [a.id, a])).values()];
}
