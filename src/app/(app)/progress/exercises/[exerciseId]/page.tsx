import { ClientExerciseHistoryChart } from "@/components/progress/ClientCharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { exerciseHistory } from "@/lib/analytics/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Exercise history",
};

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profile")
    .select("mass_unit")
    .eq("id", user!.id)
    .maybeSingle();
  const massUnit = (profile?.mass_unit as "kg" | "lb") ?? "kg";

  const history = await exerciseHistory(exerciseId);

  return (
    <div className="motion-settle space-y-4">
      <p className="text-[14px]">
        <a href="/progress" className="text-muted underline-offset-2 hover:underline">
          Progress
        </a>
        <span className="text-muted"> / </span>
        <span className="text-ink">{history.exerciseName}</span>
      </p>

      <section>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          {history.exerciseName}
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          Per-session top working load from completed workouts only.
        </p>
      </section>

      {history.points.length < 2 ? (
        <EmptyState
          title="Log this exercise twice to see a trend"
          description={
            history.points.length === 1
              ? "One session is on record. Finish another to plot a line."
              : "No completed working sets for this exercise yet."
          }
        />
      ) : null}

      <ClientExerciseHistoryChart
        points={history.points}
        unitLabel={massUnit}
      />

      {history.points.length > 0 ? (
        <ul className="divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
          {[...history.points].reverse().map((p) => (
            <li key={p.sessionId}>
              <a
                href={`/log/${p.sessionId}/review`}
                className="flex min-h-11 items-center justify-between gap-3 px-3 py-3 text-[14px]"
              >
                <span className="text-muted">{p.date}</span>
                <span className="tabular text-ink">
                  {p.topLoad} {massUnit} × {p.topReps}
                  {p.e1rm != null
                    ? ` · e1RM ${Math.round(p.e1rm * 10) / 10}`
                    : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
