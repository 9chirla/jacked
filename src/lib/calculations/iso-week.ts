/** ISO week key `YYYY-Www` from a UTC calendar date (YYYY-MM-DD or Date). */
export function isoWeekKey(input: string | Date): string {
  const d =
    typeof input === "string"
      ? new Date(`${input.slice(0, 10)}T00:00:00.000Z`)
      : new Date(
          Date.UTC(
            input.getUTCFullYear(),
            input.getUTCMonth(),
            input.getUTCDate(),
          ),
        );
  // Thursday in current week decides the year
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

/** Monday (UTC) of the ISO week containing `input`. */
export function isoWeekMonday(input: string | Date): Date {
  const d =
    typeof input === "string"
      ? new Date(`${input.slice(0, 10)}T00:00:00.000Z`)
      : new Date(
          Date.UTC(
            input.getUTCFullYear(),
            input.getUTCMonth(),
            input.getUTCDate(),
          ),
        );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dayNum - 1));
  return d;
}

export function addIsoWeeks(monday: Date, weeks: number): Date {
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d;
}

export function formatIsoWeekLabel(key: string): string {
  // 2026-W41 → W41
  const m = key.match(/W(\d+)/);
  return m ? `W${m[1]}` : key;
}
