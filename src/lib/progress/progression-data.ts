import {
  defaultIncrementKg,
  suggestProgression,
  type ProgressionSuggestion,
} from "@/lib/calculations/progression";
import { createClient } from "@/lib/supabase/server";

export async function suggestionsForRecentExercises(
  limit = 4,
  modulation?: { fatigue?: number | null; soreness?: number | null },
): Promise<
  Array<{
    exerciseId: string;
    exerciseName: string;
    suggestion: ProgressionSuggestion;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessions } = await supabase
    .from("workout_session")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(12);

  if (!sessions?.length) return [];

  const sessionIds = sessions.map((s) => s.id);
  const { data: ses } = await supabase
    .from("session_exercise")
    .select("id, exercise_id, session_id, exercise:exercise_id(name, primary_pattern, rep_range_low, rep_range_high)")
    .in("session_id", sessionIds);

  type ExerciseMeta = {
    name: string;
    pattern: string | null;
    low: number;
    high: number;
    sessionExerciseIds: {
      id: string;
      sessionId: string;
      completedAt: string;
    }[];
  };
  const byExercise = new Map<string, ExerciseMeta>();

  for (const row of ses ?? []) {
    const ex = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
    if (!ex || !row.exercise_id) continue;
    const session = sessions.find((s) => s.id === row.session_id);
    const entry: ExerciseMeta = byExercise.get(row.exercise_id) ?? {
      name: ex.name as string,
      pattern: (ex.primary_pattern as string | null) ?? null,
      low: (ex.rep_range_low as number | null) ?? 6,
      high: (ex.rep_range_high as number | null) ?? 12,
      sessionExerciseIds: [],
    };
    entry.sessionExerciseIds.push({
      id: row.id as string,
      sessionId: row.session_id as string,
      completedAt: (session?.completed_at as string | null) ?? "",
    });
    byExercise.set(row.exercise_id, entry);
  }

  const { data: overrides } = await supabase
    .from("progression_override")
    .select("exercise_id, load, target_reps_low, target_reps_high")
    .eq("user_id", user.id);

  const overrideMap = new Map(
    (overrides ?? []).map((o) => [
      o.exercise_id as string,
      {
        load: o.load == null ? null : Number(o.load),
        targetRepsLow: o.target_reps_low as number | null,
        targetRepsHigh: o.target_reps_high as number | null,
      },
    ]),
  );

  const out: Array<{
    exerciseId: string;
    exerciseName: string;
    suggestion: ProgressionSuggestion;
  }> = [];

  for (const [exerciseId, meta] of byExercise) {
    if (out.length >= limit) break;
    const ordered = [...meta.sessionExerciseIds].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    );
    const recentSessions = [];
    for (const se of ordered.slice(0, 3)) {
      const { data: sets } = await supabase
        .from("exercise_set")
        .select("load, reps, kind")
        .eq("session_exercise_id", se.id)
        .eq("kind", "working")
        .order("set_number");
      if (sets?.length) {
        recentSessions.push(
          sets.map((s) => ({
            load: s.load == null ? null : Number(s.load),
            reps: s.reps,
          })),
        );
      }
    }

    const lastAt = ordered[0]?.completedAt;
    const daysSinceLast = lastAt
      ? Math.floor(
          (Date.now() - new Date(lastAt).getTime()) / 86_400_000,
        )
      : null;

    const suggestion = suggestProgression({
      exerciseName: meta.name,
      recentSessions,
      repRangeLow: meta.low,
      repRangeHigh: meta.high,
      incrementKg: defaultIncrementKg(meta.pattern),
      daysSinceLast,
      fatigue: modulation?.fatigue ?? null,
      soreness: modulation?.soreness ?? null,
      override: overrideMap.get(exerciseId) ?? null,
    });

    out.push({ exerciseId, exerciseName: meta.name, suggestion });
  }

  return out;
}
