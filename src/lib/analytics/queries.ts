import type {
  EstimatedPrRow,
  ExerciseHistoryPoint,
  MeasuredPrRow,
  RangeKey,
} from "@/lib/analytics/types";
import { epleyE1rm } from "@/lib/calculations/volume";
import {
  completionRate,
  currentWeekStreak,
  longestWeekStreak,
  sessionsInIsoWeek,
  sessionsPerWeekBars,
} from "@/lib/calculations/streaks";
import {
  periodVolumeDelta,
  weeklyVolumeBars,
} from "@/lib/calculations/weekly-volume";
import { createClient } from "@/lib/supabase/server";

export type { EstimatedPrRow, ExerciseHistoryPoint, MeasuredPrRow, RangeKey };

export function rangeToWeeks(range: RangeKey): number | null {
  switch (range) {
    case "4w":
      return 4;
    case "3m":
      return 13;
    case "6m":
      return 26;
    case "1y":
      return 52;
    case "all":
      return null;
  }
}

export function resolveRange(raw: string | undefined): RangeKey {
  if (raw === "4w" || raw === "3m" || raw === "6m" || raw === "1y" || raw === "all") {
    return raw;
  }
  return "3m";
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function listCompletedSessions(limit = 200) {
  const { supabase, userId } = await requireUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("workout_session")
    .select(
      "id, status, started_at, completed_at, duration_seconds, total_volume, total_reps, total_working_sets, session_rpe, template_id, note",
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return [];
  }

  const templateIds = [
    ...new Set(
      data
        .map((r) => r.template_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nameByTemplate = new Map<string, string>();
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from("workout_template")
      .select("id, name")
      .in("id", templateIds);
    for (const t of templates ?? []) {
      nameByTemplate.set(t.id as string, t.name as string);
    }
  }

  return data.map((r) => {
    const templateId = r.template_id as string | null;
    const tmplName = templateId ? nameByTemplate.get(templateId) : undefined;
    return {
      id: r.id as string,
      title: tmplName ?? (r.note as string | null) ?? "Workout",
      startedAt: r.started_at as string | null,
      completedAt: r.completed_at as string | null,
      durationSeconds: r.duration_seconds as number | null,
      totalVolume: r.total_volume != null ? Number(r.total_volume) : null,
      totalReps: r.total_reps as number | null,
      totalWorkingSets: r.total_working_sets as number | null,
      sessionRpe: r.session_rpe != null ? Number(r.session_rpe) : null,
      templateId,
    };
  });
}

export async function analyticsBundle(options: {
  sessionsPerWeek: number;
  range: RangeKey;
}) {
  const sessions = await listCompletedSessions(400);
  const weeks = rangeToWeeks(options.range) ?? Math.max(12, sessions.length || 12);
  const volumeBars = weeklyVolumeBars(
    sessions.map((s) => ({
      completedAt: s.completedAt,
      startedAt: s.startedAt,
      totalVolume: s.totalVolume,
    })),
    Math.min(weeks, 52),
  );
  const frequencyBars = sessionsPerWeekBars(
    sessions.map((s) => ({
      completedAt: s.completedAt,
      startedAt: s.startedAt,
    })),
    Math.min(weeks, 52),
  );
  const volumeDelta = periodVolumeDelta(
    sessions.map((s) => ({
      completedAt: s.completedAt,
      startedAt: s.startedAt,
      totalVolume: s.totalVolume,
    })),
    4,
  );

  return {
    sessions,
    volumeBars,
    frequencyBars,
    volumeDelta,
    sessionsThisWeek: sessionsInIsoWeek(
      sessions.map((s) => ({
        completedAt: s.completedAt,
        startedAt: s.startedAt,
      })),
    ),
    streakWeeks: currentWeekStreak(
      sessions.map((s) => ({
        completedAt: s.completedAt,
        startedAt: s.startedAt,
      })),
    ),
    longestStreak: longestWeekStreak(
      sessions.map((s) => ({
        completedAt: s.completedAt,
        startedAt: s.startedAt,
      })),
    ),
    completionRate4w: completionRate(
      sessions.map((s) => ({
        completedAt: s.completedAt,
        startedAt: s.startedAt,
      })),
      options.sessionsPerWeek,
      4,
    ),
  };
}

export async function listMeasuredPrs(limit = 40): Promise<MeasuredPrRow[]> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return [];

  const { data: sets } = await supabase
    .from("exercise_set")
    .select(
      "id, load, reps, completed_at, session_exercise_id, session_exercise!inner(session_id, exercise_id, exercise:exercise_id(id, name))",
    )
    .eq("user_id", userId)
    .eq("is_pr", true)
    .eq("kind", "working")
    .order("completed_at", { ascending: false })
    .limit(limit);

  return (sets ?? []).map((row) => {
    const se = row.session_exercise as unknown as {
      session_id: string;
      exercise_id: string;
      exercise: { id: string; name: string } | { id: string; name: string }[] | null;
    };
    const ex = Array.isArray(se.exercise) ? se.exercise[0] : se.exercise;
    return {
      setId: row.id as string,
      exerciseId: se.exercise_id,
      exerciseName: ex?.name ?? "Exercise",
      load: Number(row.load),
      reps: Number(row.reps),
      completedAt: row.completed_at as string | null,
      sessionId: se.session_id,
    };
  });
}

/** Highest Epley e1RM per exercise from completed working sets (derived). */
export async function listEstimatedE1rmPrs(
  limit = 40,
): Promise<EstimatedPrRow[]> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return [];

  const { data: sets } = await supabase
    .from("exercise_set")
    .select(
      "id, load, reps, completed_at, session_exercise!inner(exercise_id, exercise:exercise_id(id, name))",
    )
    .eq("user_id", userId)
    .eq("kind", "working")
    .not("completed_at", "is", null)
    .not("load", "is", null)
    .not("reps", "is", null)
    .order("completed_at", { ascending: false })
    .limit(500);

  const best = new Map<string, EstimatedPrRow>();
  for (const row of sets ?? []) {
    const load = Number(row.load);
    const reps = Number(row.reps);
    const e1rm = epleyE1rm(load, reps);
    if (e1rm == null) continue;
    const se = row.session_exercise as unknown as {
      exercise_id: string;
      exercise: { id: string; name: string } | { id: string; name: string }[] | null;
    };
    const ex = Array.isArray(se.exercise) ? se.exercise[0] : se.exercise;
    const exerciseId = se.exercise_id;
    const prev = best.get(exerciseId);
    if (!prev || e1rm > prev.e1rm) {
      best.set(exerciseId, {
        exerciseId,
        exerciseName: ex?.name ?? "Exercise",
        e1rm,
        load,
        reps,
        setId: row.id as string,
        completedAt: row.completed_at as string | null,
      });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, limit);
}

export async function exerciseHistory(
  exerciseId: string,
  limit = 40,
): Promise<{
  exerciseName: string;
  points: ExerciseHistoryPoint[];
}> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { exerciseName: "Exercise", points: [] };

  const { data: exercise } = await supabase
    .from("exercise")
    .select("id, name")
    .eq("id", exerciseId)
    .maybeSingle();

  const { data: ses } = await supabase
    .from("session_exercise")
    .select(
      "id, session_id, workout_session!inner(id, status, completed_at, started_at, user_id)",
    )
    .eq("exercise_id", exerciseId)
    .eq("workout_session.user_id", userId)
    .eq("workout_session.status", "completed")
    .limit(limit * 2);

  const points: ExerciseHistoryPoint[] = [];
  for (const se of ses ?? []) {
    const session = se.workout_session as unknown as {
      id: string;
      completed_at: string | null;
      started_at: string | null;
    };
    const { data: sets } = await supabase
      .from("exercise_set")
      .select("load, reps, kind, completed_at")
      .eq("session_exercise_id", se.id)
      .eq("user_id", userId)
      .eq("kind", "working")
      .not("completed_at", "is", null);

    const working = (sets ?? []).filter(
      (s) => s.load != null && s.reps != null,
    );
    if (working.length === 0) continue;

    let topLoad = 0;
    let topReps = 0;
    let volume = 0;
    let bestE1rm: number | null = null;
    for (const s of working) {
      const load = Number(s.load);
      const reps = Number(s.reps);
      volume += load * reps;
      if (load > topLoad || (load === topLoad && reps > topReps)) {
        topLoad = load;
        topReps = reps;
      }
      const e = epleyE1rm(load, reps);
      if (e != null && (bestE1rm == null || e > bestE1rm)) bestE1rm = e;
    }

    const date = (session.completed_at ?? session.started_at ?? "").slice(0, 10);
    points.push({
      sessionId: session.id,
      date,
      topLoad,
      topReps,
      volume,
      e1rm: bestE1rm,
    });
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return {
    exerciseName: (exercise?.name as string) ?? "Exercise",
    points,
  };
}

export type MuscleHardSet = {
  muscle: string;
  sets: number;
};

/** Working sets per muscle group in the trailing 7 days. */
export async function hardSetsByMuscleLast7Days(): Promise<MuscleHardSet[]> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return [];

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const { data: sets } = await supabase
    .from("exercise_set")
    .select(
      "id, kind, completed_at, session_exercise!inner(exercise:exercise_id(muscle_groups))",
    )
    .eq("user_id", userId)
    .eq("kind", "working")
    .not("completed_at", "is", null)
    .gte("completed_at", since.toISOString())
    .limit(1000);

  const counts = new Map<string, number>();
  for (const row of sets ?? []) {
    const se = row.session_exercise as unknown as {
      exercise:
        | { muscle_groups: string[] | null }
        | { muscle_groups: string[] | null }[]
        | null;
    };
    const ex = Array.isArray(se.exercise) ? se.exercise[0] : se.exercise;
    const groups = ex?.muscle_groups?.length
      ? ex.muscle_groups
      : ["unspecified"];
    for (const g of groups) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([muscle, setsCount]) => ({ muscle, sets: setsCount }))
    .sort((a, b) => b.sets - a.sets);
}

export { buildAnalyticsSummary } from "./summary";