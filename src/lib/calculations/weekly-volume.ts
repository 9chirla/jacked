import {
  addIsoWeeks,
  formatIsoWeekLabel,
  isoWeekKey,
  isoWeekMonday,
} from "./iso-week";

export type VolumeSession = {
  completedAt: string | null;
  startedAt: string | null;
  totalVolume: number | null;
};

export type WeekVolumeBar = {
  weekKey: string;
  label: string;
  volume: number;
};

export type WeekBarsOptions = {
  /**
   * Start the series on the ISO week of the first session.
   * Leading empty weeks before any logging are omitted.
   * Gaps after the first week stay as 0 (no interpolation).
   */
  clipBeforeFirst?: boolean;
};

function earliestSessionMonday(sessions: Array<{
  completedAt: string | null;
  startedAt: string | null;
}>): Date | null {
  let earliest: Date | null = null;
  for (const s of sessions) {
    const raw = s.completedAt ?? s.startedAt;
    if (!raw) continue;
    const monday = isoWeekMonday(new Date(raw));
    if (!earliest || monday.getTime() < earliest.getTime()) {
      earliest = monday;
    }
  }
  return earliest;
}

/**
 * Σ working-set volume per ISO week for a trailing window.
 * Empty weeks after the first logged week stay as 0 so gaps stay visible.
 */
export function weeklyVolumeBars(
  sessions: VolumeSession[],
  weeks = 12,
  asOf: Date = new Date(),
  opts: WeekBarsOptions = { clipBeforeFirst: true },
): WeekVolumeBar[] {
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const raw = s.completedAt ?? s.startedAt;
    if (!raw) continue;
    const key = isoWeekKey(new Date(raw));
    byWeek.set(key, (byWeek.get(key) ?? 0) + (s.totalVolume ?? 0));
  }

  const endMonday = isoWeekMonday(asOf);
  let startMonday = addIsoWeeks(endMonday, -(weeks - 1));

  if (opts.clipBeforeFirst !== false) {
    const first = earliestSessionMonday(sessions);
    if (!first) return [];
    if (first.getTime() > startMonday.getTime()) {
      startMonday = first;
    }
  }

  const bars: WeekVolumeBar[] = [];
  for (
    let monday = startMonday;
    monday.getTime() <= endMonday.getTime();
    monday = addIsoWeeks(monday, 1)
  ) {
    const key = isoWeekKey(monday);
    bars.push({
      weekKey: key,
      label: formatIsoWeekLabel(key),
      volume: byWeek.get(key) ?? 0,
    });
  }
  return bars;
}

/** Volume in `weeks` ending at `asOf` vs the immediately preceding equal window. */
export function periodVolumeDelta(
  sessions: VolumeSession[],
  weeks: number,
  asOf: Date = new Date(),
): { current: number; previous: number; delta: number | null } {
  const endMonday = isoWeekMonday(asOf);
  const currentStart = addIsoWeeks(endMonday, -(weeks - 1));
  const previousEnd = addIsoWeeks(currentStart, -1);
  const previousStart = addIsoWeeks(previousEnd, -(weeks - 1));

  const sumIn = (start: Date, end: Date) => {
    const startKey = isoWeekKey(start);
    const endKey = isoWeekKey(end);
    let total = 0;
    for (const s of sessions) {
      const raw = s.completedAt ?? s.startedAt;
      if (!raw) continue;
      const key = isoWeekKey(new Date(raw));
      if (key >= startKey && key <= endKey) {
        total += s.totalVolume ?? 0;
      }
    }
    return total;
  };

  const current = sumIn(currentStart, endMonday);
  const previous = sumIn(previousStart, previousEnd);
  const hasAny = sessions.some((s) => (s.totalVolume ?? 0) > 0);
  return {
    current,
    previous,
    delta: hasAny && (current > 0 || previous > 0) ? current - previous : null,
  };
}
