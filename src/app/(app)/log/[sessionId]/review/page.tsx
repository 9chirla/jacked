import { DeleteSessionButton } from "@/components/history/DeleteSessionButton";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Workout review",
};

export default async function SessionReviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("workout_session")
    .select(
      "id, status, started_at, completed_at, duration_seconds, total_volume, total_reps, total_working_sets, session_rpe, note, workout_template(name)",
    )
    .eq("id", sessionId)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!session) notFound();

  const template = Array.isArray(session.workout_template)
    ? session.workout_template[0]
    : session.workout_template;

  const minutes = Math.round((session.duration_seconds ?? 0) / 60);

  return (
    <div className="motion-settle space-y-6">
      <section>
        <p className="text-[14px] text-muted">
          {session.status === "completed" ? "Completed" : session.status}
        </p>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          {template?.name ?? "Workout"}
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          {minutes > 0 ? `${minutes} min` : "Logged"}
          {session.session_rpe != null ? ` · RPE ${session.session_rpe}` : ""}
        </p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Volume"
          value={`${Number(session.total_volume ?? 0)} kg`}
        />
        <StatTile label="Sets" value={`${session.total_working_sets ?? 0}`} />
        <StatTile label="Reps" value={`${session.total_reps ?? 0}`} />
      </div>

      {session.note ? (
        <Card>
          <p className="text-[14px] text-muted">Note</p>
          <p className="mt-1 text-[16px] text-ink">{session.note}</p>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/today"
          className="inline-flex min-h-12 items-center rounded-[var(--radius)] bg-accent px-4 text-[16px] font-medium text-accent-ink"
        >
          Back to Today
        </a>
        <a
          href={`/log/${sessionId}`}
          className="inline-flex min-h-12 items-center text-[14px] text-muted underline-offset-4 hover:underline"
        >
          View session
        </a>
      </div>

      <DeleteSessionButton
        sessionId={sessionId}
        status={session.status ?? "completed"}
        redirectTo="/history"
      />
    </div>
  );
}
