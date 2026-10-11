import type { PlannedDay } from "@/lib/plan/types";

export type SessionCompletion = {
  sessionId: string;
  templateId: string;
  /** Local YYYY-MM-DD when the session was completed. */
  completedDate: string;
  /** Discarded / abandoned sessions must not advance the plan. */
  status: "completed" | "abandoned" | "in_progress";
};

/**
 * Apply a completed session onto the week plan. Off-plan completions attach
 * as an extra done day (or match a planned day by date/template).
 */
export function applyCompletion(
  plannedDays: PlannedDay[],
  session: SessionCompletion,
): PlannedDay[] {
  if (session.status !== "completed") {
    return plannedDays.map((d) => ({ ...d }));
  }

  const byDate = plannedDays.findIndex((d) => d.date === session.completedDate);
  if (byDate >= 0) {
    return plannedDays.map((d, i) =>
      i === byDate
        ? {
            ...d,
            status: "done" as const,
            sessionId: session.sessionId,
            templateId: session.templateId,
          }
        : { ...d },
    );
  }

  const byTemplate = plannedDays.findIndex(
    (d) => d.status === "planned" && d.templateId === session.templateId,
  );
  if (byTemplate >= 0) {
    return plannedDays.map((d, i) =>
      i === byTemplate
        ? {
            ...d,
            date: session.completedDate,
            status: "done" as const,
            sessionId: session.sessionId,
          }
        : { ...d },
    );
  }

  // Off-plan completion: append done day.
  const appended: PlannedDay = {
    date: session.completedDate,
    templateId: session.templateId,
    status: "done",
    sessionId: session.sessionId,
  };
  return [...plannedDays.map((d) => ({ ...d })), appended].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/** Last completed template id from plan days (by date). */
export function lastCompletedFromPlan(
  plannedDays: PlannedDay[],
): string | null {
  const done = plannedDays
    .filter((d) => d.status === "done")
    .sort((a, b) => a.date.localeCompare(b.date));
  return done.at(-1)?.templateId ?? null;
}

/** Mark planned days before today as missed. */
export function markPastPlannedMissed(
  plannedDays: PlannedDay[],
  today: string,
): PlannedDay[] {
  return plannedDays.map((d) =>
    d.status === "planned" && d.date < today
      ? { ...d, status: "missed" as const }
      : { ...d },
  );
}
