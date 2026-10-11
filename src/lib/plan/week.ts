import type { Weekday } from "@/lib/plan/types";

/** Format a Date as YYYY-MM-DD using UTC calendar fields (date-only values). */
export function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

/**
 * Local calendar YYYY-MM-DD in `timeZone` for an instant.
 * Uses Intl parts so DST transitions stay on the correct local day.
 */
export function localDateString(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    return formatDateUTC(instant);
  }
  return `${y}-${m}-${d}`;
}

/** Weekday 0=Sun…6=Sat for a YYYY-MM-DD interpreted as a pure calendar date. */
export function weekdayOfDate(iso: string): Weekday {
  return parseDateUTC(iso).getUTCDay() as Weekday;
}

/**
 * Sunday-start week containing `dateIso` (YYYY-MM-DD local calendar day).
 * `timeZone` is recorded for callers; date math is on the calendar string.
 */
export function weekStartFor(
  dateIso: string,
  timeZone: string,
): string {
  // Calendar day is already localized by the caller; tz is retained for API
  // symmetry with week_plan.timezone and DST boundary tests.
  void timeZone;
  const d = parseDateUTC(dateIso);
  const day = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - day);
  return formatDateUTC(d);
}

/** All 7 dates (Sun→Sat) for a week starting Sunday. */
export function weekDates(weekStart: string): string[] {
  const start = parseDateUTC(weekStart);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return formatDateUTC(d);
  });
}

export function addDays(iso: string, days: number): string {
  const d = parseDateUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateUTC(d);
}
