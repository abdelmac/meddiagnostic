import type { Attempt } from "./types";

export const STUDY_TIME_ZONE = "Europe/Paris";
export const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const;
const DAY_MS = 86_400_000;
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STUDY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar dates, not 24-hour intervals: Paris DST days have 23 or 25 hours. */
export function studyDay(date: Date): string {
  const parts = dayFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T12:00:00.000Z`) / DAY_MS);
}

function dayKey(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export type StudyStreak = {
  today: string;
  current: number;
  longest: number;
  activeDays: number;
  todayCount: number;
  activeToday: boolean;
  /** Seven calendar days ending today, suitable for a compact activity strip. */
  week: { day: string; count: number; today: boolean }[];
  milestones: { days: number; achieved: boolean }[];
  nextMilestone: number | null;
};

/**
 * A study day starts with one answered question, correct or incorrect.
 * Goals do not gate the streak. This is encouragement based on saved practice,
 * never evidence for billing, rankings or server authorization.
 */
export function studyStreak(
  attempts: readonly Pick<Attempt, "id" | "at">[],
  now = new Date(),
): StudyStreak {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid study date");
  const today = studyDay(now);
  const todayNumber = dayNumber(today);
  // A synced/replayed attempt must never count twice or activate multiple days.
  // Keep the earliest valid occurrence if a damaged snapshot repeats an ID.
  const unique = new Map<string, number>();
  for (const attempt of attempts) {
    const time = Date.parse(attempt.at);
    if (!attempt.id || !Number.isFinite(time) || time > now.getTime()) continue;
    const previous = unique.get(attempt.id);
    if (previous === undefined || time < previous) unique.set(attempt.id, time);
  }
  const counts = new Map<number, number>();
  for (const time of unique.values()) {
    const day = dayNumber(studyDay(new Date(time)));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const days = [...counts.keys()].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let previous = Number.NEGATIVE_INFINITY;
  for (const day of days) {
    run = day === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  // Yesterday's streak remains available until the end of the current day.
  let current = 0;
  let cursor = counts.has(todayNumber) ? todayNumber : todayNumber - 1;
  while (counts.has(cursor)) {
    current += 1;
    cursor -= 1;
  }
  const todayCount = counts.get(todayNumber) ?? 0;
  return {
    today,
    current,
    longest,
    activeDays: days.length,
    todayCount,
    activeToday: todayCount > 0,
    week: Array.from({ length: 7 }, (_, index) => {
      const day = todayNumber - 6 + index;
      return {
        day: dayKey(day),
        count: counts.get(day) ?? 0,
        today: day === todayNumber,
      };
    }),
    milestones: STREAK_MILESTONES.map((milestone) => ({
      days: milestone,
      achieved: longest >= milestone,
    })),
    nextMilestone:
      STREAK_MILESTONES.find((milestone) => milestone > longest) ?? null,
  };
}
