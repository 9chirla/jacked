import { nextTemplateIndex, sortTemplates, templateAt } from "@/lib/plan/rotation";
import type {
  PlannedDay,
  TemplateRef,
  Weekday,
} from "@/lib/plan/types";
import { weekDates, weekdayOfDate } from "@/lib/plan/week";

export type PlanWeekInput = {
  weekStart: string;
  availableDays: Weekday[];
  templates: TemplateRef[];
  lastCompletedTemplateId: string | null;
  /** Local today YYYY-MM-DD — days before this are not planned. */
  today: string;
  maxDays?: number;
};

/**
 * Pick up to maxDays from availableDays: future-or-today only, prefer spread
 * with rest days between sessions.
 */
export function pickTrainingDays(
  weekStart: string,
  availableDays: Weekday[],
  today: string,
  maxDays: number,
): string[] {
  const dates = weekDates(weekStart);
  const free = dates.filter((date) => {
    if (date < today) return false;
    const wd = weekdayOfDate(date);
    return availableDays.includes(wd);
  });
  if (free.length <= maxDays) return free;

  // Greedy spread: maximize minimum gap between chosen days.
  const chosen: string[] = [];
  const pool = [...free];
  // Always take earliest remaining with best spacing from already chosen.
  while (chosen.length < maxDays && pool.length > 0) {
    if (chosen.length === 0) {
      // Start near the middle of the free set for balance, else first.
      const mid = pool[Math.floor((pool.length - 1) / 2)]!;
      chosen.push(mid);
      pool.splice(pool.indexOf(mid), 1);
      continue;
    }
    let best = pool[0]!;
    let bestScore = -1;
    for (const candidate of pool) {
      const minGap = Math.min(
        ...chosen.map((c) => Math.abs(dayIndex(candidate) - dayIndex(c))),
      );
      if (minGap > bestScore) {
        bestScore = minGap;
        best = candidate;
      }
    }
    chosen.push(best);
    pool.splice(pool.indexOf(best), 1);
  }
  return chosen.sort();
}

function dayIndex(iso: string): number {
  return Number(iso.replaceAll("-", ""));
}

export function planWeek(input: PlanWeekInput): PlannedDay[] {
  const maxDays = input.maxDays ?? 3;
  const sorted = sortTemplates(input.templates);
  if (sorted.length === 0) return [];

  const days = pickTrainingDays(
    input.weekStart,
    input.availableDays,
    input.today,
    maxDays,
  );

  let idx = nextTemplateIndex(sorted, input.lastCompletedTemplateId);
  const planned: PlannedDay[] = [];
  for (const date of days) {
    const tmpl = templateAt(sorted, idx);
    if (!tmpl) break;
    planned.push({
      date,
      templateId: tmpl.id,
      status: "planned",
      sessionId: null,
    });
    idx += 1;
  }
  return planned;
}
