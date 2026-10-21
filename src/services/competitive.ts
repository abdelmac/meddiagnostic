import { getSupabase } from "./supabase";
import { quotaChanged } from "./quotas";
import type { Question } from "../domain/types";

export type CompetitiveMode = "duel" | "race";
export type CompetitiveProfile = {
  nickname: string;
  study_year: number;
  season: string;
  rating: number;
  played: number;
  wins: number;
  draws: number;
};
export type CompetitiveQuestion = {
  title: string;
  context: string;
  options: string[];
  reasoning?: string;
  diagram?: Question["diagram"];
};
export type CompetitiveMatch = {
  activity?: { ordinal: number; at: string }[];
  id: string;
  code: string;
  mode: CompetitiveMode;
  season: string;
  status: "waiting" | "playing" | "finished" | "cancelled";
  ranked: boolean;
  host: boolean;
  serverNow: string;
  startsAt: string | null;
  endsAt: string | null;
  ordinal: number;
  total: number;
  question: { fr: CompetitiveQuestion; en: CompetitiveQuestion } | null;
  players: {
    nickname: string;
    studyYear: number;
    self: boolean;
    answered: number;
    score: number | null;
    ratingDelta: number | null;
  }[];
  review?: {
    ordinal: number;
    choice: number;
    correct: boolean;
    correctChoice: number;
    fr: CompetitiveQuestion;
    en: CompetitiveQuestion;
  }[];
};
export type CompetitiveRecent = Pick<
  CompetitiveMatch,
  "id" | "code" | "mode" | "status"
> & { createdAt: string };
export type Leaderboard = {
  season: string;
  studyYear: number;
  players: {
    nickname: string;
    rating: number;
    played: number;
    wins: number;
    draws: number;
    self: boolean;
  }[];
};

export class CompetitiveError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "CompetitiveError";
  }
}
export const competitiveCodes = [
  "daily_limit",
  "question_limit",
  "invalid_profile",
  "study_year_locked",
  "study_year_mismatch",
  "profile_required",
  "invalid_invitation",
  "invitation_closed",
  "lobby_full",
  "active_match_exists",
  "match_not_found",
  "host_required",
  "second_player_required",
  "match_not_started",
  "answer_out_of_order",
  "question_bank_unavailable",
] as const;

async function command<T>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const client = getSupabase();
  if (!client) throw new CompetitiveError("unavailable");
  const { data, error } = await client.rpc("competitive", {
    command: name,
    payload,
  });
  if (error) {
    throw new CompetitiveError(
      competitiveCodes.find((code) => error.message.includes(code)) ??
        "unavailable",
    );
  }
  if (data?.quota && data.quota.allowed === false) {
    throw new CompetitiveError(
      data.quota.error === "daily_limit" ? "daily_limit" : "question_limit",
    );
  }
  if ((name === "create" || name === "join") && data?.id) quotaChanged();
  return data as T;
}

export const competitive = {
  profile: () => command<CompetitiveProfile | null>("profile"),
  saveProfile: (nickname: string, studyYear: number) =>
    command<CompetitiveProfile>("profile", { nickname, studyYear }),
  recent: () => command<CompetitiveRecent[]>("list"),
  leaderboard: (studyYear: number) =>
    command<Leaderboard>("leaderboard", { studyYear }),
  create: (mode: CompetitiveMode, requestId: string) =>
    command<CompetitiveMatch>("create", { mode, requestId }),
  join: (code: string) => command<CompetitiveMatch>("join", { code }),
  get: (matchId: string) => command<CompetitiveMatch>("get", { matchId }),
  start: (matchId: string) => command<CompetitiveMatch>("start", { matchId }),
  answer: (matchId: string, ordinal: number, choice: number) =>
    command<CompetitiveMatch>("answer", { matchId, ordinal, choice }),
  cancel: (matchId: string) =>
    command<CompetitiveMatch | { left: true }>("cancel", { matchId }),
};

export function competitiveRank(
  rating: number,
  played: number,
  english = false,
) {
  if (played < 3) return english ? "Placement" : "Placement";
  if (rating >= 1500) return english ? "Diamond" : "Diamant";
  if (rating >= 1300) return english ? "Platinum" : "Platine";
  if (rating >= 1150) return english ? "Gold" : "Or";
  if (rating >= 1050) return english ? "Silver" : "Argent";
  return "Bronze";
}

/** Client request ID is an idempotency key, never evidence of score or timing. */
export function competitiveRequestId() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues)
    globalThis.crypto.getRandomValues(bytes);
  else for (let n = 0; n < 16; n++) bytes[n] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
