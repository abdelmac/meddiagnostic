import { test } from "node:test";
import assert from "node:assert/strict";
import { studyDay, studyStreak } from "../src/domain/streaks";

const practice = (at: string, id = at) => ({ id, at });

test("one real answer starts a streak regardless of score; goals do not gate activity", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  assert.equal(studyStreak([], now).current, 0);
  const one = studyStreak([practice("2026-10-21T10:00:00Z")], now);
  assert.equal(one.current, 1);
  assert.equal(one.longest, 1);
  assert.equal(one.todayCount, 1);
  assert.equal(one.activeDays, 1);
  assert.equal(one.week.at(-1)?.today, true);
  assert.equal(one.nextMilestone, 3);
});

test("consecutive days preserve yesterday's run until today is finished", () => {
  const attempts = [19, 20].map((day) => practice(`2026-10-${day}T10:00:00Z`));
  const waiting = studyStreak(attempts, new Date("2026-10-21T12:00:00Z"));
  assert.equal(waiting.current, 2);
  assert.equal(waiting.todayCount, 0);
  assert.equal(waiting.activeToday, false);
  const continued = studyStreak(
    [...attempts, practice("2026-10-21T10:00:00Z")],
    new Date("2026-10-21T12:00:00Z"),
  );
  assert.equal(continued.current, 3);
  assert.equal(
    continued.milestones.find((milestone) => milestone.days === 3)?.achieved,
    true,
  );
  assert.equal(continued.nextMilestone, 7);
});

test("a gap resets the current run and preserves the best and earned milestones", () => {
  const attempts = [1, 2, 3, 4, 5, 6, 7].map((day) =>
    practice(`2026-10-0${day}T10:00:00Z`),
  );
  const result = studyStreak(
    [...attempts, practice("2026-10-20T10:00:00Z")],
    new Date("2026-10-21T12:00:00Z"),
  );
  assert.equal(result.current, 1);
  assert.equal(result.longest, 7);
  assert.equal(result.activeDays, 8);
  assert.equal(
    result.milestones.filter((milestone) => milestone.achieved).length,
    2,
  );
  assert.equal(result.nextMilestone, 14);
  assert.equal(
    studyStreak(attempts, new Date("2026-10-21T12:00:00Z")).current,
    0,
  );
});

test("replayed and synced attempt IDs count once, future/invalid activity never counts", () => {
  const result = studyStreak(
    [
      practice("2026-10-20T10:00:00Z", "same"),
      practice("2026-10-21T10:00:00Z", "same"),
      practice("2026-10-21T11:00:00Z", "today"),
      practice("2026-10-21T11:00:00Z", "today"),
      practice("2026-10-22T10:00:00Z", "future"),
      practice("invalid", "broken"),
      practice("2026-10-21T10:00:00Z", ""),
    ],
    new Date("2026-10-21T12:00:00Z"),
  );
  assert.equal(result.todayCount, 1);
  assert.equal(result.current, 2);
  assert.equal(result.activeDays, 2);
  assert.equal(
    result.week.reduce((sum, day) => sum + day.count, 0),
    2,
  );
});

test("Paris midnight, not UTC or the viewer's timezone, starts the study day", () => {
  assert.equal(studyDay(new Date("2026-10-20T21:59:59Z")), "2026-10-20");
  assert.equal(studyDay(new Date("2026-10-20T22:00:00Z")), "2026-10-21");
  const result = studyStreak(
    [practice("2026-10-20T21:59:59Z"), practice("2026-10-20T22:00:00Z")],
    new Date("2026-10-20T22:00:01Z"),
  );
  assert.equal(result.current, 2);
  assert.equal(result.todayCount, 1);
});

test("spring DST's 23-hour day and autumn's 25-hour day stay consecutive", () => {
  const spring = studyStreak(
    [
      practice("2026-03-28T23:30:00Z"), // March 29, before the missing hour
      practice("2026-03-29T22:30:00Z"), // March 30
    ],
    new Date("2026-03-30T10:00:00Z"),
  );
  assert.equal(spring.current, 2);
  assert.equal(spring.todayCount, 1);
  const autumn = studyStreak(
    [
      practice("2026-10-24T22:30:00Z"), // October 25 before the repeated hour
      practice("2026-10-25T01:30:00Z"), // October 25 after the repeated hour
      practice("2026-10-25T23:30:00Z"), // October 26
    ],
    new Date("2026-10-26T10:00:00Z"),
  );
  assert.equal(autumn.current, 2);
  assert.equal(autumn.activeDays, 2);
  assert.equal(autumn.week.at(-2)?.count, 2);
});

test("the seven-day strip crosses month/year boundaries and always ends today", () => {
  const result = studyStreak(
    [practice("2025-12-31T12:00:00Z"), practice("2026-01-01T12:00:00Z")],
    new Date("2026-01-02T12:00:00Z"),
  );
  assert.deepEqual(
    result.week.map((day) => day.day),
    [
      "2025-12-27",
      "2025-12-28",
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ],
  );
  assert.equal(result.current, 2);
});

test("a 100-day milestone is awarded from actual daily practice only", () => {
  const start = Date.parse("2026-01-01T12:00:00Z");
  const attempts = Array.from({ length: 100 }, (_, i) =>
    practice(new Date(start + i * 86_400_000).toISOString()),
  );
  const result = studyStreak(attempts, new Date(start + 99 * 86_400_000));
  assert.equal(result.current, 100);
  assert.equal(result.longest, 100);
  assert.ok(result.milestones.every((milestone) => milestone.achieved));
  assert.equal(result.nextMilestone, null);
  assert.throws(
    () => studyStreak([], new Date("invalid")),
    /Invalid study date/,
  );
});
