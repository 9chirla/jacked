"use client";

import {
  buildPlanPreview,
  upsertWeekPlan,
} from "@/app/actions/plan";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { queueAndSync } from "@/lib/offline/mutate";
import { cacheActiveWeekPlan } from "@/lib/offline/week-plan-store";
import type { PlannedDay, TemplateRef, Weekday } from "@/lib/plan/types";
import { weekDates, weekdayOfDate } from "@/lib/plan/week";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  weekStart: string;
  timezone: string;
  today: string;
  initialAvailable?: Weekday[];
  initialPlanned?: PlannedDay[];
  initialStatus?: "active" | "completed" | "skipped";
  planId?: string;
};

export function WeekPlanner({
  weekStart,
  timezone,
  today,
  initialAvailable = [],
  initialPlanned = [],
  initialStatus = "active",
  planId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [available, setAvailable] = useState<Weekday[]>(initialAvailable);
  const [planned, setPlanned] = useState<PlannedDay[]>(initialPlanned);
  const [templates, setTemplates] = useState<TemplateRef[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  useEffect(() => {
    startTransition(async () => {
      const result = await buildPlanPreview({
        weekStart,
        availableDays: available,
        timezone,
        today,
      });
      if (!result.ok) return;
      const data = result.data as {
        plannedDays: PlannedDay[];
        templates: TemplateRef[];
        note: string | null;
      };
      setTemplates(data.templates);
      setPlanned(data.plannedDays);
      setNote(data.note);
    });
  }, [available, weekStart, timezone, today]);

  function toggleDay(date: string) {
    const wd = weekdayOfDate(date) as Weekday;
    setAvailable((prev) =>
      prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd].sort(),
    );
  }

  function swapDay(fromDate: string, toDate: string) {
    setPlanned((prev) => {
      const a = prev.find((p) => p.date === fromDate);
      if (!a) return prev;
      const without = prev.filter((p) => p.date !== fromDate);
      return [...without, { ...a, date: toDate }].sort((x, y) =>
        x.date.localeCompare(y.date),
      );
    });
  }

  function templateName(id: string) {
    return templates.find((t) => t.id === id)?.name ?? "Session";
  }

  return (
    <div className="space-y-4">
      <p className="text-[16px] text-muted">
        Tap the days you can train. We assign Full Body A → B → A continuing
        from your last completed session.
      </p>

      <ul className="grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const wd = weekdayOfDate(date) as Weekday;
          const selected = available.includes(wd);
          const past = date < today;
          return (
            <li key={date}>
              <button
                type="button"
                disabled={past}
                onClick={() => toggleDay(date)}
                className={`flex min-h-14 w-full flex-col items-center justify-center rounded-[var(--radius)] border text-[12px] ${
                  selected
                    ? "border-accent-ink/20 bg-accent text-accent-ink"
                    : "border-line bg-surface text-muted"
                } disabled:opacity-40`}
                aria-pressed={selected}
                aria-label={`${DAY_LABELS[wd]} ${date}`}
              >
                <span>{DAY_LABELS[wd]}</span>
                <span className="tabular">{date.slice(8)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {note ? <p className="text-[14px] text-muted">{note}</p> : null}

      <div className="space-y-2">
        <h2 className="font-display text-[20px] font-semibold text-ink">
          Preview
        </h2>
        {planned.length === 0 ? (
          <p className="text-[14px] text-muted">No sessions planned yet.</p>
        ) : (
          <ul className="space-y-2">
            {planned.map((p) => (
              <li
                key={`${p.date}-${p.templateId}`}
                className="flex min-h-12 items-center justify-between gap-2 rounded-[var(--radius)] border border-line bg-surface px-3"
              >
                <span className="text-[16px] text-ink">
                  {p.date} · {templateName(p.templateId)}
                </span>
                <label className="text-[12px] text-muted">
                  Swap
                  <select
                    className="ml-1 min-h-11 rounded border border-line bg-bg px-2 text-[14px] text-ink"
                    value={p.date}
                    onChange={(e) => swapDay(p.date, e.target.value)}
                    aria-label={`Move ${templateName(p.templateId)}`}
                  >
                    {dates
                      .filter((d) => d >= today)
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-12 flex-1"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const clientUpdatedAt = new Date().toISOString();
              const deviceTz =
                Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
              const payload = {
                id: planId,
                week_start: weekStart,
                timezone: deviceTz,
                available_days: available,
                planned_days: planned,
                status: "active" as const,
                client_updated_at: clientUpdatedAt,
              };
              await cacheActiveWeekPlan({
                id: planId ?? "local",
                userId: "",
                weekStart,
                timezone: deviceTz,
                availableDays: available,
                plannedDays: planned,
                status: "active",
                clientUpdatedAt,
              });
              const result = await queueAndSync({
                entity: "week_plan",
                op: "upsert",
                payload,
                clientKey: `week-plan:${weekStart}`,
                execute: () => upsertWeekPlan(payload),
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.push("/today");
            });
          }}
        >
          Confirm plan
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const payload = {
                id: planId,
                week_start: weekStart,
                timezone,
                available_days: available,
                planned_days: [],
                status: "skipped" as const,
                client_updated_at: new Date().toISOString(),
              };
              await upsertWeekPlan(payload);
              router.push("/today");
            });
          }}
        >
          Skip this week
        </Button>
      </div>

      {initialStatus === "skipped" ? (
        <Chip selected>This week was skipped</Chip>
      ) : null}
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
