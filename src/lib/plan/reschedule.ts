import { nextTemplateIndex, sortTemplates, templateAt } from "@/lib/plan/rotation";
import type { PlannedDay, TemplateRef, Weekday } from "@/lib/plan/types";
import { pickTrainingDays } from "@/lib/plan/plan-week";

export type RescheduleInput = {
  weekStart: string;
  plannedDays: PlannedDay[];
  availableDays: Weekday[];
  templates: TemplateRef[];
  today: string;
  lastCompletedTemplateId: string | null;
};

/**
 * Move missed (or past planned) sessions onto remaining free days; keep
 * rotation order. Unplaceable stay "missed".
 */
export function rescheduleMissed(input: RescheduleInput): PlannedDay[] {
  const sorted = sortTemplates(input.templates);
  const done = input.plannedDays.filter((d) => d.status === "done");
  const keepSkipped = input.plannedDays.filter((d) => d.status === "skipped");

  const needCount = input.plannedDays.filter(
    (d) => d.status === "planned" || d.status === "missed",
  ).length;

  // Mark past planned as missed first conceptually, then refill.
  const openSlots = pickTrainingDays(
    input.weekStart,
    input.availableDays,
    input.today,
    3,
  ).filter((date) => !done.some((d) => d.date === date));

  const lastId =
    done.sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.templateId ??
    input.lastCompletedTemplateId;
  let idx = nextTemplateIndex(sorted, lastId);

  const refilled: PlannedDay[] = [...done, ...keepSkipped];
  let placed = 0;
  for (const date of openSlots) {
    if (placed >= needCount) break;
    const tmpl = templateAt(sorted, idx);
    if (!tmpl) break;
    refilled.push({
      date,
      templateId: tmpl.id,
      status: "planned",
      sessionId: null,
    });
    idx += 1;
    placed += 1;
  }

  const unplaced = needCount - placed;
  for (let i = 0; i < unplaced; i += 1) {
    refilled.push({
      date: input.today,
      templateId: templateAt(sorted, idx)?.id ?? sorted[0]?.id ?? "",
      status: "missed",
      sessionId: null,
    });
    idx += 1;
  }

  return refilled
    .filter((d) => d.templateId)
    .sort((a, b) => a.date.localeCompare(b.date));
}
