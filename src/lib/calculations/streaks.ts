import { addIsoWeeks, isoWeekKey, isoWeekMonday } from "./iso-week";

export type CompletedSessionDate = {
  completedAt: string | null;
  startedAt: string | null;
};

function sessionDateKey(row: CompletedSessionDate): string | null {
  const raw = row.completedAt ?? row.startedAt;
  if (!raw) return null;
  return isoWeekKey(new Date(raw));
}

function mondayOfIsoWeek(year: number, week: number): Date {
  // ISO week 1 is the week with Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const mondayW1 = new Date(jan4);
  mondayW1.setUTCDate(jan4.getUTCDate() - (dayNum - 1));
  return addIsoWeeks(mondayW1, week - 1);
}

function parseWeekKey(key: string): Date | null {
  const parts = key.match(/^(\d{4})-W(\d+)$/);
  if (!parts) return null;
  return mondayOfIsoWeek(Number(parts[1]), Number(parts[2]));
}

/**
 * Current streak: consecutive ISO weeks with ≥1 completed session.
 * If the current week is empty, count starts from the previous week.
 * Informational only (§10.8) — never used for shaming copy.
 */
export function currentWeekStreak(
  sessions: CompletedSessionDate[],
  asOf: Date = new Date(),
): number {
  const weekKeys = new Set(
    sessions.map(sessionDateKey).filter((k): k is string => k != null),
  );

  let streak = 0;
  let cursor = isoWeekMonday(asOf);

  if (!weekKeys.has(isoWeekKey(cursor))) {
    cursor = addIsoWeeks(cursor, -1);
  }

  for (let i = 0; i < 104; i++) {
    const key = isoWeekKey(cursor);
    if (weekKeys.has(key)) {
      streak += 1;
      cursor = addIsoWeeks(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

/** Longest run of consecutive ISO weeks with ≥1 completion. */
export function longestWeekStreak(sessions: CompletedSessionDate[]): number {
  const weekKeys = [
    ...new Set(
      sessions.map(sessionDateKey).filter((k): k is string => k != null),
    ),
  ].sort();

  if (weekKeys.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < weekKeys.length; i++) {
    const prevMon = parseWeekKey(weekKeys[i - 1]!);
    const curMon = parseWeekKey(weekKeys[i]!);
    if (!prevMon || !curMon) continue;
    const diffDays = (curMon.getTime() - prevMon.getTime()) / 86_400_000;
    if (diffDays === 7) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

/** Sessions whose completion falls in the ISO week containing `asOf`. */
export function sessionsInIsoWeek(
  sessions: CompletedSessionDate[],
  asOf: Date = new Date(),
): number {
  const key = isoWeekKey(asOf);
  return sessions.filter((s) => sessionDateKey(s) === key).length;
}

/**
 * Completion rate over the last `weeks` ISO weeks:
 * completed_sessions / (weeks * targetPerWeek), capped at 1.
 */
export function completionRate(
  sessions: CompletedSessionDate[],
  targetPerWeek: number,
  weeks = 4,
  asOf: Date = new Date(),
): number | null {
  if (targetPerWeek <= 0 || weeks <= 0) return null;
  const keys = new Set<string>();
  let monday = isoWeekMonday(asOf);
  for (let i = 0; i < weeks; i++) {
    keys.add(isoWeekKey(monday));
    monday = addIsoWeeks(monday, -1);
  }
  const count = sessions.filter((s) => {
    const k = sessionDateKey(s);
    return k != null && keys.has(k);
  }).length;
  return Math.min(1, count / (weeks * targetPerWeek));
}

/** Sessions completed per ISO week for a trailing window (gaps as 0). */
export function sessionsPerWeekBars(
  sessions: CompletedSessionDate[],
  weeks = 12,
  asOf: Date = new Date(),
  opts: { clipBeforeFirst?: boolean } = { clipBeforeFirst: true },
): Array<{ weekKey: string; label: string; count: number }> {
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const key = sessionDateKey(s);
    if (!key) continue;
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  const endMonday = isoWeekMonday(asOf);
  let startMonday = addIsoWeeks(endMonday, -(weeks - 1));

  if (opts.clipBeforeFirst !== false) {
    let earliest: Date | null = null;
    for (const s of sessions) {
      const raw = s.completedAt ?? s.startedAt;
      if (!raw) continue;
      const monday = isoWeekMonday(new Date(raw));
      if (!earliest || monday.getTime() < earliest.getTime()) {
        earliest = monday;
      }
    }
    if (!earliest) return [];
    if (earliest.getTime() > startMonday.getTime()) {
      startMonday = earliest;
    }
  }

  const bars: Array<{ weekKey: string; label: string; count: number }> = [];
  for (
    let monday = startMonday;
    monday.getTime() <= endMonday.getTime();
    monday = addIsoWeeks(monday, 1)
  ) {
    const key = isoWeekKey(monday);
    const m = key.match(/W(\d+)/);
    bars.push({
      weekKey: key,
      label: m ? `W${m[1]}` : key,
      count: byWeek.get(key) ?? 0,
    });
  }
  return bars;
}
