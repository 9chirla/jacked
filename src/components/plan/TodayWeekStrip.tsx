"use client";

import { rescheduleActiveWeek, startPlanSession } from "@/app/actions/plan";
import { AppLink } from "@/components/nav/AppLink";
import { Button } from "@/components/ui/Button";
import type { PlannedDay } from "@/lib/plan/types";
import { weekDates, weekdayOfDate } from "@/lib/plan/week";
import { useTransition } from "react";

const LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

type Props = {
  weekStart: string;
  today: string;
  plannedDays: PlannedDay[];
  templateNames: Record<string, string>;
  isSunday: boolean;
  hasPlan: boolean;
  planSkipped: boolean;
  adherence: { done: number; planned: number };
  greeting: string;
};

export function TodayWeekStrip({
  weekStart,
  today,
  plannedDays,
  templateNames,
  isSunday,
  hasPlan,
  planSkipped,
  adherence,
  greeting,
}: Props) {
  const [pending, startTransition] = useTransition();
  const dates = weekDates(weekStart);
  const byDate = new Map(plannedDays.map((p) => [p.date, p]));
  const next = plannedDays
    .filter((p) => p.status === "planned" && p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const hasMissed = plannedDays.some((p) => p.status === "missed");

  return (
    <section className="space-y-3">
      <p className="text-[16px] text-ink">{greeting}</p>

      {!hasPlan || planSkipped ? (
        <div
          className={`rounded-[var(--radius)] border px-4 py-4 ${
            isSunday
              ? "border-accent-ink/30 bg-accent/20"
              : "border-line bg-surface"
          }`}
        >
          <p className="font-display text-[20px] font-semibold text-ink">
            Plan this week
          </p>
          <p className="mt-1 text-[14px] text-muted">
            {planSkipped
              ? "You skipped this week. Re-open the planner if shifts changed."
              : "Pick the days you can train after Saturday’s shift drop."}
          </p>
          <AppLink
            href="/plan"
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
          >
            Open planner
          </AppLink>
        </div>
      ) : null}

      <ul className="grid grid-cols-7 gap-1" aria-label="This week">
        {dates.map((date) => {
          const wd = weekdayOfDate(date);
          const day = byDate.get(date);
          const isToday = date === today;
          const tone =
            day?.status === "done"
              ? "bg-accent/30 border-accent-ink/20 text-ink"
              : day?.status === "missed"
                ? "bg-danger/15 border-danger/30 text-ink"
                : day?.status === "planned"
                  ? "bg-surface border-line text-ink"
                  : "bg-bg border-line text-muted";
          return (
            <li key={date}>
              <div
                className={`flex min-h-12 flex-col items-center justify-center rounded-[var(--radius)] border text-[12px] ${tone} ${
                  isToday ? "ring-2 ring-accent" : ""
                }`}
                aria-current={isToday ? "date" : undefined}
              >
                <span>{LABELS[wd]}</span>
                <span className="tabular">{date.slice(8)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-[14px] text-muted">
        Adherence{" "}
        <span className="tabular text-ink">
          {adherence.done}/{adherence.planned}
        </span>{" "}
        this week
      </p>

      {next ? (
        <div className="rounded-[var(--radius)] border border-line bg-surface px-4 py-3 space-y-2">
          <p className="text-[14px] text-muted">Next session</p>
          <p className="font-display text-[22px] font-semibold text-ink">
            {templateNames[next.templateId] ?? "Workout"} · {next.date}
          </p>
          <Button
            className="w-full min-h-12"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await startPlanSession({
                  templateId: next.templateId,
                  weekStart,
                  date: next.date,
                });
              });
            }}
          >
            Start {templateNames[next.templateId] ?? "session"}
          </Button>
        </div>
      ) : null}

      {hasMissed ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await rescheduleActiveWeek();
              // revalidatePath in upsertWeekPlan refreshes RSC; no router.refresh()
              window.location.assign("/today");
            });
          }}
        >
          Reschedule missed
        </Button>
      ) : null}
    </section>
  );
}
