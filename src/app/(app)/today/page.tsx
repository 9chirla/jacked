import {
  deleteTemplate,
  duplicateTemplate,
  startTemplateSession,
} from "@/app/actions/library";
import { DeleteSessionButton } from "@/components/history/DeleteSessionButton";
import { TemplateActions } from "@/components/library/TemplateActions";
import { CacheWeekPlan } from "@/components/plan/CacheWeekPlan";
import { TodayWeekStrip } from "@/components/plan/TodayWeekStrip";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import type { PlannedDay, WeekPlanRecord } from "@/lib/plan/types";
import { localDateString, weekStartFor, weekdayOfDate } from "@/lib/plan/week";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import { ensureLibrarySeeded } from "@/lib/workout/ensure-library";

export const metadata = {
  title: "Today",
};

export default async function TodayPage() {
  await ensureLibrarySeeded();
  const auth = await requireAuthedUserId();
  if (!auth) return null;
  const { supabase, userId } = auth;

  const [{ data: profile }, { data: active }, { data: templates }] =
    await Promise.all([
      supabase
        .from("profile")
        .select("sessions_per_week, session_minutes")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("workout_session")
        .select("id, status, started_at, workout_template(name)")
        .eq("user_id", userId)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("workout_template")
        .select("id, name, day_label, sort_order")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order")
        .limit(4),
    ]);

  const { data: tzRow } = await supabase
    .from("week_plan")
    .select("timezone")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tz = (tzRow?.timezone as string) || "UTC";
  const today = localDateString(new Date(), tz);
  const weekStart = weekStartFor(today, tz);
  const isSunday = weekdayOfDate(today) === 0;

  const { data: weekPlan } = await supabase
    .from("week_plan")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  const plannedDays = (weekPlan?.planned_days as PlannedDay[]) ?? [];
  const done = plannedDays.filter((d) => d.status === "done").length;
  const plannedCount = plannedDays.filter(
    (d) => d.status === "planned" || d.status === "done" || d.status === "missed",
  ).length;
  const hasMissed = plannedDays.some((d) => d.status === "missed");
  const allDone =
    plannedCount > 0 &&
    plannedDays.every((d) => d.status === "done" || d.status === "skipped");

  let greeting = "Ready when you are.";
  if (!weekPlan) greeting = "Plan this week so Today knows your A/B/A days.";
  else if (weekPlan.status === "skipped") greeting = "Week skipped — rest or re-plan.";
  else if (hasMissed) greeting = "A session slipped — reschedule the rest.";
  else if (allDone) greeting = "Week complete. Nice work.";
  else if (plannedDays.some((d) => d.status === "planned"))
    greeting = "Your week is planned. Hit the next session when free.";

  const templateNames = Object.fromEntries(
    (templates ?? []).map((t) => [t.id as string, t.name as string]),
  );

  const activeTemplate = Array.isArray(active?.workout_template)
    ? active?.workout_template[0]
    : active?.workout_template;

  const nextPlanned = plannedDays
    .filter((p) => p.status === "planned" && p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const cachedPlan: WeekPlanRecord | null = weekPlan
    ? {
        id: weekPlan.id as string,
        userId: userId,
        weekStart: weekPlan.week_start as string,
        timezone: (weekPlan.timezone as string) || tz,
        availableDays: ((weekPlan.available_days as number[]) ??
          []) as WeekPlanRecord["availableDays"],
        plannedDays,
        status: weekPlan.status as WeekPlanRecord["status"],
        clientUpdatedAt: weekPlan.client_updated_at as string,
      }
    : null;

  return (
    <div className="motion-settle space-y-4">
      <CacheWeekPlan plan={cachedPlan} />
      <section>
        <p className="text-[14px] text-muted">Full Body ×3 (A/B/A)</p>
        <h1 className="font-display mt-1 text-[34px] font-semibold tracking-tight text-ink">
          {active
            ? "Session in progress"
            : nextPlanned
              ? `Up next: ${templateNames[nextPlanned.templateId] ?? "Workout"}`
              : templates?.[0]
                ? `Library: ${templates[0].name}`
                : "Nothing planned yet"}
        </h1>
        <p className="mt-2 max-w-prose text-[16px] text-muted">
          Target {profile?.sessions_per_week ?? 3} sessions · ~
          {profile?.session_minutes ?? 60} min.
        </p>
      </section>

      <TodayWeekStrip
        weekStart={weekStart}
        today={today}
        plannedDays={plannedDays}
        templateNames={templateNames}
        isSunday={isSunday}
        hasPlan={Boolean(weekPlan)}
        planSkipped={weekPlan?.status === "skipped"}
        adherence={{ done, planned: plannedCount || (profile?.sessions_per_week ?? 3) }}
        greeting={greeting}
      />

      {active ? (
        <Card className="space-y-3">
          <p className="text-[16px] text-ink">
            {activeTemplate?.name ?? "Workout"} · started{" "}
            {active.started_at
              ? active.started_at.replace("T", " ").slice(0, 16)
              : "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/log/${active.id}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
            >
              Resume session
            </a>
            <DeleteSessionButton
              sessionId={active.id}
              status="in_progress"
              variant="secondary"
              redirectTo="/today"
            />
          </div>
        </Card>
      ) : null}

      {(templates?.length ?? 0) === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Seed Full Body A/B from Settings or create a template under Templates."
          action={
            <a
              href="/templates"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
            >
              Open Templates
            </a>
          }
        />
      ) : (
        <ul className="space-y-3">
          <li className="text-[14px] text-muted">Start off-plan (any template)</li>
          {templates!.map((template) => (
            <li key={template.id}>
              <Card className="space-y-3">
                <div>
                  <h2 className="font-display text-[20px] font-semibold text-ink">
                    {template.name}
                  </h2>
                  <p className="text-[14px] text-muted">
                    Day {template.day_label ?? "—"}
                  </p>
                </div>
                <TemplateActions
                  templateId={template.id}
                  startAction={startTemplateSession}
                  duplicateAction={duplicateTemplate}
                  deleteAction={deleteTemplate}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="This week"
          value={`${done}`}
          hint={`${done} of ${plannedCount || (profile?.sessions_per_week ?? 3)} planned`}
        />
        <StatTile
          label="Library"
          value="Gym"
          hint="Commercial equipment seed"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-[14px]">
        <a
          href="/plan"
          className="inline-flex min-h-12 items-center text-muted underline-offset-4 hover:underline"
        >
          Week planner
        </a>
        <a
          href="/templates"
          className="inline-flex min-h-12 items-center text-muted underline-offset-4 hover:underline"
        >
          All templates
        </a>
        <a
          href="/exercises"
          className="inline-flex min-h-12 items-center text-muted underline-offset-4 hover:underline"
        >
          Exercise library
        </a>
      </div>
    </div>
  );
}
