import {
  addSet,
  deleteSet,
  finishSession,
  upsertSet,
} from "@/app/actions/workout";
import {
  WorkoutLogger,
  type LoggerExercise,
} from "@/components/workout/WorkoutLogger";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import {
  previousPerformanceSummary,
  seedDefaultSets,
} from "@/lib/workout/session-data";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Active workout",
};

type SetRow = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  kind: string;
  load: number | string | null;
  reps: number | null;
  completed_at: string | null;
  note: string | null;
};

export default async function ActiveSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from("workout_session")
    .select(
      "id, status, started_at, template_id, total_volume, total_reps, total_working_sets, workout_template(name)",
    )
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session) notFound();

  if (session.status === "in_progress") {
    await seedDefaultSets(sessionId);
  }

  const { data: rows } = await supabase
    .from("session_exercise")
    .select(
      "id, sort_order, target_note, exercise_id, exercise:exercise_id(name, category)",
    )
    .eq("session_id", sessionId)
    .order("sort_order");

  const exerciseIds = (rows ?? []).map((r) => r.id);
  let setRows: SetRow[] = [];
  if (exerciseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercise_set")
      .select(
        "id, session_exercise_id, set_number, kind, load, reps, completed_at, note, source",
      )
      .in("session_exercise_id", exerciseIds)
      .order("set_number");
    if (error) {
      throw new Error(`Could not load sets: ${error.message}`);
    }
    setRows = (data ?? []) as SetRow[];
  }

  const setsByExercise = new Map<string, SetRow[]>();
  for (const set of setRows) {
    const list = setsByExercise.get(set.session_exercise_id) ?? [];
    list.push(set);
    setsByExercise.set(set.session_exercise_id, list);
  }

  const template = Array.isArray(session.workout_template)
    ? session.workout_template[0]
    : session.workout_template;

  const exercises: LoggerExercise[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const exercise = Array.isArray(row.exercise)
        ? row.exercise[0]
        : row.exercise;
      const previous = row.exercise_id
        ? await previousPerformanceSummary(row.exercise_id, sessionId)
        : null;
      const sets = (setsByExercise.get(row.id) ?? []).map((s) => ({
        id: s.id,
        session_exercise_id: s.session_exercise_id,
        set_number: s.set_number,
        kind: s.kind,
        load: s.load == null ? null : Number(s.load),
        reps: s.reps,
        completed_at: s.completed_at,
        note: s.note,
      }));
      return {
        id: row.id,
        name: exercise?.name ?? "Exercise",
        category: exercise?.category ?? "",
        targetNote: row.target_note,
        previousSummary: previous?.summary ?? null,
        sets,
      };
    }),
  );

  if (exercises.length === 0) {
    return (
      <div className="motion-settle space-y-4">
        <EmptyState
          title="No exercises in this session"
          description="Start from a template that has exercises."
        />
        <a
          href="/templates"
          className="inline-flex min-h-12 items-center text-[14px] text-muted underline-offset-4 hover:underline"
        >
          Back to templates
        </a>
      </div>
    );
  }

  return (
    <div className="motion-settle">
      <WorkoutLogger
        sessionId={session.id}
        title={template?.name ?? "Workout"}
        status={session.status}
        startedAt={session.started_at}
        initialExercises={exercises}
        initialTotals={{
          volume: Number(session.total_volume ?? 0),
          reps: session.total_reps ?? 0,
          workingSets: session.total_working_sets ?? 0,
        }}
        upsertSetAction={upsertSet}
        addSetAction={addSet}
        deleteSetAction={deleteSet}
        finishSessionAction={finishSession}
      />
    </div>
  );
}
