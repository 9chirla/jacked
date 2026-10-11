import { evaluateMeasuredPr, nextMeasuredPrHolder } from "@/lib/calculations/prs";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Mark / demote measured PRs for a completed working set (§10.4). */
export async function applyMeasuredPrOnSave(
  supabase: SupabaseClient,
  input: {
    userId: string;
    setId: string;
    sessionExerciseId: string;
    kind: string;
    load: number | null;
    reps: number | null;
    completed: boolean;
  },
): Promise<{ isPr: boolean }> {
  if (
    !input.completed ||
    input.kind !== "working" ||
    input.load == null ||
    input.reps == null
  ) {
    await supabase
      .from("exercise_set")
      .update({ is_pr: false })
      .eq("id", input.setId)
      .eq("user_id", input.userId);
    return { isPr: false };
  }

  const { data: se } = await supabase
    .from("session_exercise")
    .select("exercise_id")
    .eq("id", input.sessionExerciseId)
    .maybeSingle();
  if (!se) return { isPr: false };

  const { data: flagged } = await supabase
    .from("exercise_set")
    .select("id, load, session_exercise!inner(exercise_id)")
    .eq("user_id", input.userId)
    .eq("kind", "working")
    .eq("reps", input.reps)
    .eq("is_pr", true)
    .neq("id", input.setId)
    .eq("session_exercise.exercise_id", se.exercise_id)
    .limit(1)
    .maybeSingle();

  let previousBest: { id: string; load: number } | null = flagged
    ? { id: flagged.id as string, load: Number(flagged.load) }
    : null;

  if (!previousBest) {
    const { data: best } = await supabase
      .from("exercise_set")
      .select("id, load, session_exercise!inner(exercise_id)")
      .eq("user_id", input.userId)
      .eq("kind", "working")
      .eq("reps", input.reps)
      .not("completed_at", "is", null)
      .not("load", "is", null)
      .neq("id", input.setId)
      .eq("session_exercise.exercise_id", se.exercise_id)
      .order("load", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (best) {
      previousBest = { id: best.id as string, load: Number(best.load) };
    }
  }

  const result = evaluateMeasuredPr(
    {
      id: input.setId,
      kind: input.kind,
      completed: true,
      load: input.load,
      reps: input.reps,
    },
    previousBest,
  );

  await supabase
    .from("exercise_set")
    .update({ is_pr: result.isPr })
    .eq("id", input.setId)
    .eq("user_id", input.userId);

  if (result.demoteId) {
    await supabase
      .from("exercise_set")
      .update({ is_pr: false })
      .eq("id", result.demoteId)
      .eq("user_id", input.userId);
  }

  return { isPr: result.isPr };
}

/** If a deleted set held a PR, promote the next-best at the same reps. */
export async function reassignPrAfterDelete(
  supabase: SupabaseClient,
  input: {
    userId: string;
    sessionExerciseId: string;
    wasPr: boolean;
    reps: number | null;
  },
): Promise<void> {
  if (!input.wasPr || input.reps == null) return;

  const { data: se } = await supabase
    .from("session_exercise")
    .select("exercise_id")
    .eq("id", input.sessionExerciseId)
    .maybeSingle();
  if (!se) return;

  const { data: candidates } = await supabase
    .from("exercise_set")
    .select(
      "id, load, kind, completed_at, session_exercise!inner(exercise_id)",
    )
    .eq("user_id", input.userId)
    .eq("kind", "working")
    .eq("reps", input.reps)
    .not("completed_at", "is", null)
    .eq("session_exercise.exercise_id", se.exercise_id);

  const nextId = nextMeasuredPrHolder(
    (candidates ?? []).map((c) => ({
      id: c.id as string,
      load: c.load != null ? Number(c.load) : null,
      kind: c.kind as string,
      completed: c.completed_at != null,
    })),
  );

  if (nextId) {
    await supabase
      .from("exercise_set")
      .update({ is_pr: true })
      .eq("id", nextId)
      .eq("user_id", input.userId);
  }
}
