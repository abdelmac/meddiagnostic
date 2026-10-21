import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { Check, Flame, Trophy, X } from "lucide-react-native";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { useStore } from "../state";
import { studyStreak, STREAK_MILESTONES } from "../domain/streaks";
import { Bar, Button, Card, Txt } from "./components";
import { useTheme } from "./theme";

/** Refreshes while open and when returning after midnight, without an animation. */
function useStudyStreak() {
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  return useMemo(
    () =>
      studyStreak(
        [...state.attempts, ...(state.studyEvents ?? [])],
        new Date(Math.max(now.getTime(), Date.now())),
      ),
    [state.attempts, state.studyEvents, now],
  );
}

export function StreakPanel({
  compact = false,
  onStart,
}: {
  compact?: boolean;
  onStart?: () => void;
}) {
  const c = useTheme();
  const { state } = useStore();
  const { user } = useAuth();
  const { language } = useI18n();
  const text = (fr: string, en: string) => (language === "fr" ? fr : en);
  const streak = useStudyStreak();
  const goal = Math.max(
    1,
    Number.isFinite(state.preferences.dailyGoal)
      ? Math.floor(state.preferences.dailyGoal)
      : 5,
  );
  const warm = state.preferences.dark ? "#ffbc6b" : "#a65316";
  const locale = language === "fr" ? "fr-FR" : "en-GB";
  const goalReached = streak.todayCount >= goal;
  return (
    <Card style={{ padding: compact ? 20 : 24, gap: 17 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            width: 58,
            height: 64,
            borderRadius: 19,
            backgroundColor: c.yellow,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Flame
            size={32}
            color={warm}
            fill={streak.activeToday ? warm : "none"}
          />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt style={{ fontSize: 12, fontWeight: "700", color: warm }}>
            {text("VOTRE RYTHME", "YOUR STUDY RHYTHM")}
          </Txt>
          <Txt
            accessibilityRole="header"
            style={{
              fontSize: compact ? 23 : 28,
              lineHeight: 36,
              fontWeight: "700",
            }}
          >
            {streak.current}{" "}
            {text(
              streak.current === 1 ? "jour de suite" : "jours de suite",
              streak.current === 1 ? "day streak" : "day streak",
            )}
          </Txt>
        </View>
        {!compact && <Trophy size={25} color={warm} />}
      </View>

      <Txt muted style={{ fontSize: 13 }}>
        {streak.activeToday
          ? text(
              "Un peu de pratique, un jour de plus. Bien joué !",
              "A little practice, one more day. Well done!",
            )
          : streak.current > 0
            ? text(
                "Votre série continue : une réponse aujourd’hui suffit.",
                "Your streak is ready to continue: one answer today is enough.",
              )
            : text(
                "Une première réponse aujourd’hui lance votre série.",
                "Your first answer today starts your streak.",
              )}
      </Txt>

      <View
        accessibilityLabel={text(
          "Vos 7 derniers jours de révision",
          "Your last 7 study days",
        )}
        style={{
          flexDirection: "row",
          gap: 5,
          justifyContent: "space-between",
        }}
      >
        {streak.week.map((day) => {
          const date = new Date(`${day.day}T12:00:00.000Z`);
          const label = date.toLocaleDateString(locale, {
            timeZone: "UTC",
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          return (
            <View
              key={day.day}
              accessible
              accessibilityLabel={`${label}, ${day.count} ${text("réponse(s)", "answer(s)")}${day.today ? text(", aujourd’hui", ", today") : ""}`}
              style={{ flex: 1, alignItems: "center", gap: 7 }}
            >
              <Txt muted style={{ fontSize: 11 }}>
                {date
                  .toLocaleDateString(locale, {
                    timeZone: "UTC",
                    weekday: "short",
                  })
                  .replace(".", "")}
              </Txt>
              <View
                style={{
                  width: "100%",
                  maxWidth: 31,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: day.count > 0 ? c.accent : c.bg,
                  borderWidth: day.today ? 2 : 1,
                  borderColor: day.today
                    ? warm
                    : day.count > 0
                      ? c.accent
                      : c.line,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {day.count > 0 ? (
                  <Check
                    size={17}
                    color={state.preferences.dark ? c.bg : "#fff"}
                    strokeWidth={3}
                  />
                ) : (
                  <Txt muted style={{ fontSize: 11 }}>
                    {date.getUTCDate()}
                  </Txt>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 5,
          }}
        >
          <Txt style={{ fontSize: 12, fontWeight: "600" }}>
            {goalReached
              ? text("Objectif du jour atteint", "Daily goal reached")
              : text("Votre objectif du jour", "Your daily goal")}
          </Txt>
          <Txt muted style={{ fontSize: 12 }}>
            {streak.todayCount} / {goal} {text("réponses", "answers")}
          </Txt>
        </View>
        <Bar value={Math.min(100, (streak.todayCount / goal) * 100)} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 15 }}>
        <Txt muted style={{ fontSize: 12 }}>
          {text("Record", "Best")}
          {" · "}
          {streak.longest}{" "}
          {text(
            streak.longest === 1 ? "jour" : "jours",
            streak.longest === 1 ? "day" : "days",
          )}
        </Txt>
        <Txt muted style={{ fontSize: 12 }}>
          {streak.activeDays}{" "}
          {text(
            streak.activeDays === 1
              ? "jour de pratique au total"
              : "jours de pratique au total",
            streak.activeDays === 1
              ? "study day in total"
              : "study days in total",
          )}
        </Txt>
      </View>

      {!compact && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {streak.milestones.map((milestone) => (
              <View
                key={milestone.days}
                accessible
                accessibilityLabel={`${milestone.days} ${text("jours", "days")} · ${milestone.achieved ? text("palier atteint", "milestone reached") : text("à découvrir", "ahead")}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  borderWidth: 1,
                  borderColor: milestone.achieved ? warm : c.line,
                  borderRadius: 10,
                  backgroundColor: milestone.achieved ? c.yellow : c.bg,
                  paddingHorizontal: 9,
                  paddingVertical: 8,
                }}
              >
                {milestone.achieved && <Trophy size={13} color={warm} />}
                <Txt
                  style={{
                    fontSize: 12,
                    color: milestone.achieved ? warm : c.muted,
                  }}
                >
                  {milestone.days} {text("j", "d")}
                </Txt>
              </View>
            ))}
          </View>
          <Txt muted style={{ fontSize: 12 }}>
            {text(
              "Une réponse suffit pour valider un jour, même en cas d’erreur. Le compteur change à minuit, heure de Paris. Après une pause, votre record reste acquis.",
              "One answer completes a study day, even if incorrect. The day resets at midnight in Paris. Your best streak stays with you after a break.",
            )}
          </Txt>
          {!user && (
            <Txt muted style={{ fontSize: 12 }}>
              {text(
                "En invité, votre série reste sur cet appareil. Créez un compte et importez votre progression pour la retrouver ailleurs.",
                "As a guest, your streak stays on this device. Create an account and import your progress to keep it across devices.",
              )}
            </Txt>
          )}
        </>
      )}
      {onStart && !streak.activeToday && (
        <Button
          small
          secondary
          label={text("Réviser aujourd’hui", "Study today")}
          onPress={onStart}
        />
      )}
    </Card>
  );
}

/** Mount once above the page content: loading or importing history never pops a toast. */
export function StreakCelebration() {
  const c = useTheme();
  const { state, ready } = useStore();
  const { language } = useI18n();
  const [celebration, setCelebration] = useState<{
    current: number;
    milestone: boolean;
  } | null>(null);
  const baseline = useRef<{
    ids: Set<string>;
    today: string;
    todayCount: number;
  } | null>(null);
  const mountedAt = useRef(Date.now());
  const activity = useMemo(
    () => [...state.attempts, ...(state.studyEvents ?? [])],
    [state.attempts, state.studyEvents],
  );
  useEffect(() => {
    if (!ready) return;
    const now = new Date();
    const streak = studyStreak(activity, now);
    const previous = baseline.current;
    const ids = new Set(activity.map((attempt) => attempt.id));
    baseline.current = {
      ids,
      today: streak.today,
      todayCount: streak.todayCount,
    };
    if (!previous) return;
    const answeredHere = activity.some((attempt) => {
      const time = Date.parse(attempt.at);
      return (
        !previous.ids.has(attempt.id) &&
        time >= mountedAt.current &&
        time <= now.getTime()
      );
    });
    if (
      answeredHere &&
      (previous.today !== streak.today || previous.todayCount === 0) &&
      streak.todayCount > 0
    ) {
      setCelebration({
        current: streak.current,
        milestone: STREAK_MILESTONES.some((days) => days === streak.current),
      });
    }
  }, [activity, ready]);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 10_000);
    return () => clearTimeout(timer);
  }, [celebration]);
  if (!celebration) return null;
  const text = (fr: string, en: string) => (language === "fr" ? fr : en);
  return (
    <View
      accessibilityLiveRegion="polite"
      testID="streak-celebration"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 14,
        backgroundColor: c.soft,
        marginBottom: 16,
      }}
    >
      <Flame size={24} color={c.accent} />
      <View style={{ flex: 1 }}>
        <Txt style={{ fontWeight: "700" }}>
          {celebration.milestone
            ? text(
                `Palier atteint : ${celebration.current} jours de suite !`,
                `Milestone reached: a ${celebration.current}-day streak!`,
              )
            : text(
                "Votre journée de révision est validée !",
                "Your study day is complete!",
              )}
        </Txt>
        <Txt muted style={{ fontSize: 12 }}>
          {text(
            "Chaque réponse fait avancer votre apprentissage.",
            "Every answer moves your learning forward.",
          )}
        </Txt>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={text(
          "Fermer le message de série",
          "Dismiss streak message",
        )}
        onPress={() => setCelebration(null)}
        style={{
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={18} color={c.muted} />
      </Pressable>
    </View>
  );
}
