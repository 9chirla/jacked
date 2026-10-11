export type DatedWeight = {
  /** ISO date YYYY-MM-DD */
  date: string;
  weightKg: number;
};

export type RollingPoint = {
  date: string;
  weightKg: number;
  /** null when the ±3 day window is incomplete */
  centredAvgKg: number | null;
  centredStatus: "full" | "partial" | "none";
};

function parseDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function dayOffset(date: string, days: number): string {
  const ms = parseDay(date) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * 7-day centred rolling average (§10.7).
 * Window is [date-3, date+3]. Full only when all 7 calendar days have a value.
 * Never interpolates missing days.
 */
export function centredSevenDayAverage(
  entries: DatedWeight[],
): RollingPoint[] {
  const byDate = new Map<string, number>();
  for (const e of entries) {
    byDate.set(e.date, e.weightKg);
  }
  const dates = [...byDate.keys()].sort();

  return dates.map((date) => {
    const weightKg = byDate.get(date)!;
    const windowDates = Array.from({ length: 7 }, (_, i) =>
      dayOffset(date, i - 3),
    );
    const values = windowDates
      .map((d) => byDate.get(d))
      .filter((v): v is number => v != null);

    if (values.length === 7) {
      const avg = values.reduce((a, b) => a + b, 0) / 7;
      return {
        date,
        weightKg,
        centredAvgKg: avg,
        centredStatus: "full" as const,
      };
    }
    if (values.length >= 4) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return {
        date,
        weightKg,
        centredAvgKg: avg,
        centredStatus: "partial" as const,
      };
    }
    return {
      date,
      weightKg,
      centredAvgKg: null,
      centredStatus: "none" as const,
    };
  });
}

export function deltaVsDaysAgo(
  entries: DatedWeight[],
  daysAgo: number,
): number | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1]!;
  const target = dayOffset(latest.date, -daysAgo);
  const prior = [...sorted].reverse().find((e) => e.date <= target);
  if (!prior) return null;
  return latest.weightKg - prior.weightKg;
}

/** Slope of full centred averages in kg/week (needs ≥2 full points). */
export function centredSlopeKgPerWeek(points: RollingPoint[]): number | null {
  const full = points.filter(
    (p) => p.centredStatus === "full" && p.centredAvgKg != null,
  );
  if (full.length < 2) return null;
  const first = full[0]!;
  const last = full[full.length - 1]!;
  const daySpan =
    (parseDay(last.date) - parseDay(first.date)) / 86_400_000;
  if (daySpan <= 0) return null;
  return ((last.centredAvgKg! - first.centredAvgKg!) / daySpan) * 7;
}
