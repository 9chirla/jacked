import { WeekPlanner } from "@/components/plan/WeekPlanner";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import type { PlannedDay, Weekday } from "@/lib/plan/types";
import { localDateString, weekStartFor } from "@/lib/plan/week";

export const metadata = {
  title: "Plan this week",
};

export default async function PlanPage() {
  const auth = await requireAuthedUserId();
  if (!auth) return null;

  const timezone = "UTC";
  // Prefer last plan timezone; otherwise UTC until client confirms.
  const { data: last } = await auth.supabase
    .from("week_plan")
    .select("timezone")
    .eq("user_id", auth.userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tz = (last?.timezone as string) || timezone;
  const today = localDateString(new Date(), tz);
  const weekStart = weekStartFor(today, tz);

  const { data: plan } = await auth.supabase
    .from("week_plan")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  return (
    <div className="motion-settle space-y-4">
      <section>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          Plan this week
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          Week of {weekStart} (Sunday start). Shifts drop Saturday — pick free
          days and we schedule A/B/A.
        </p>
      </section>
      <WeekPlanner
        weekStart={weekStart}
        timezone={tz}
        today={today}
        planId={plan?.id as string | undefined}
        initialAvailable={(plan?.available_days as Weekday[]) ?? []}
        initialPlanned={(plan?.planned_days as PlannedDay[]) ?? []}
        initialStatus={
          (plan?.status as "active" | "completed" | "skipped") ?? "active"
        }
      />
    </div>
  );
}
