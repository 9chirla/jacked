import { describe, expect, it } from "vitest";
import {
  completionRate,
  currentWeekStreak,
  longestWeekStreak,
  sessionsInIsoWeek,
} from "./streaks";

describe("currentWeekStreak", () => {
  it("counts consecutive ISO weeks with completions", () => {
    // 2026-10-11 is a Sunday → ISO week 41 (Mon 2026-10-05)
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    const sessions = [
      { completedAt: "2026-10-10T10:00:00.000Z", startedAt: null }, // W41
      { completedAt: "2026-10-03T10:00:00.000Z", startedAt: null }, // W40
      { completedAt: "2026-09-26T10:00:00.000Z", startedAt: null }, // W39
    ];
    expect(currentWeekStreak(sessions, asOf)).toBe(3);
  });

  it("breaks on a gap week", () => {
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    const sessions = [
      { completedAt: "2026-10-10T10:00:00.000Z", startedAt: null }, // W41
      // skip W40
      { completedAt: "2026-09-26T10:00:00.000Z", startedAt: null }, // W39
    ];
    expect(currentWeekStreak(sessions, asOf)).toBe(1);
  });

  it("returns 0 with no sessions", () => {
    expect(currentWeekStreak([], new Date("2026-10-11T12:00:00.000Z"))).toBe(
      0,
    );
  });
});

describe("longestWeekStreak", () => {
  it("finds the longest consecutive run", () => {
    const sessions = [
      { completedAt: "2026-09-12T10:00:00.000Z", startedAt: null }, // W37
      { completedAt: "2026-09-19T10:00:00.000Z", startedAt: null }, // W38
      { completedAt: "2026-09-26T10:00:00.000Z", startedAt: null }, // W39
      // gap W40
      { completedAt: "2026-10-10T10:00:00.000Z", startedAt: null }, // W41
    ];
    expect(longestWeekStreak(sessions)).toBe(3);
  });
});

describe("sessionsInIsoWeek / completionRate", () => {
  it("counts sessions in the current ISO week", () => {
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    const sessions = [
      { completedAt: "2026-10-06T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-10-10T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-09-30T10:00:00.000Z", startedAt: null },
    ];
    expect(sessionsInIsoWeek(sessions, asOf)).toBe(2);
  });

  it("computes 4-week completion rate vs target", () => {
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    // 6 sessions over 4 weeks at target 3 → 6/12 = 0.5
    const sessions = [
      { completedAt: "2026-10-10T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-10-08T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-10-01T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-09-24T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-09-22T10:00:00.000Z", startedAt: null },
      { completedAt: "2026-09-15T10:00:00.000Z", startedAt: null },
    ];
    expect(completionRate(sessions, 3, 4, asOf)).toBe(0.5);
  });
});
