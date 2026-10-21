export type Specialty = "dermatologie" | "cardiologie" | "pneumologie" | "anatomie";
export type Confidence = "fragile" | "moyenne" | "solide";
export type AnatomyFocus = "origin" | "insertion" | "action" | "innervation" | "identification";
export type Question = {
  id: string;
  version: number;
  specialty: Specialty;
  theme: string;
  difficulty: "débutant" | "intermédiaire" | "avancé";
  type: "clinique" | "visuel" | "mixte";
  objective: string;
  title: string;
  context: string;
  clues: string[];
  options: { label: string; explanation: string }[];
  correct: number;
  reasoning: string;
  takeaway: string;
  sources: { title: string; url: string }[];
  editorialDate: string;
  status: "demo" | "draft";
  medicalReviewer: null;
  studyYears?: number[];
  anatomyFocus?: AnatomyFocus;
  diagram?: { structureId: string; view?: "front" | "back" };
  image?: { uri: string; attribution: string; license: string; alt: string };
};
export type Attempt = {
  id: string;
  questionId: string;
  version: number;
  choice: number;
  correct: boolean;
  confidence: Confidence;
  at: string;
  repeated: boolean;
  sessionId: string;
};
export type Review = {
  questionId: string;
  due: string;
  interval: number;
  streak: number;
};
export type Session = {
  id: string;
  questionIds: string[];
  index: number;
  mode: "learning" | "exam";
  startedAt: string;
  finishedAt?: string;
  answers: Record<string, { choice: number; confidence: Confidence }>;
  timerMinutes: number | null;
  kind: "quiz" | "review";
  studyYear?: number;
};
export type LocalState = {
  studyEvents?: { id: string; at: string; source: "competition" }[];
  syncMeta?: {
    actor: string;
    clock: number;
    fields: Record<string, { clock: number; actor: string; value: unknown }>;
  };
  schema: 1;
  attempts: Attempt[];
  reviews: Record<string, Review>;
  favorites: string[];
  marked: string[];
  sessions: Session[];
  active: Session | null;
  preferences: {
    studyYear?: number | null;
    level: string;
    specialties: Specialty[];
    dailyGoal: number;
    dark: boolean;
    largeText: boolean;
    reminder: boolean;
  };
  reports: {
    id: string;
    questionId: string;
    version: number;
    reason: string;
    at: string;
  }[];
};
