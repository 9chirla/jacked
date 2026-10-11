"use server";

import { finishSessionSchema, upsertSetSchema } from "@/lib/validation/sets";
import { createClient } from "@/lib/supabase/server";
import {
  applyMeasuredPrOnSave,
  reassignPrAfterDelete,
} from "@/lib/workout/pr-detection";
import {
  previousPerformanceSummary,
  seedDefaultSets,
} from "@/lib/workout/session-data";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; id?: string; data?: unknown }
  | {
      ok: false;
      error: string;
      conflict?: { entity: string; server: unknown; local: unknown };
    };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function assertSessionExerciseOwner(
  sessionExerciseId: string,
  userId: string,
) {
  const supabase = await createClient();
  const { data: se } = await supabase
    .from("session_exercise")
    .select("id, session_id")
    .eq("id", sessionExerciseId)
    .maybeSingle();
  if (!se) return null;
  const { data: session } = await supabase
    .from("workout_session")
    .select("id, user_id, status")
    .eq("id", se.session_id)
    .maybeSingle();
  if (!session || session.user_id !== userId) return null;
  return { se, session };
}

export async function upsertSet(input: unknown): Promise<ActionResult> {
  const parsed = upsertSetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid set" };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const owned = await assertSessionExerciseOwner(
    parsed.data.session_exercise_id,
    user.id,
  );
  if (!owned) return { ok: false, error: "Exercise not found." };

  let completedAt: string | null = null;
  if (parsed.data.completed) {
    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from("exercise_set")
        .select("completed_at")
        .eq("id", parsed.data.id)
        .eq("user_id", user.id)
        .maybeSingle();
      completedAt = existing?.completed_at ?? new Date().toISOString();
    } else {
      completedAt = new Date().toISOString();
    }
  }

  const payload = {
    session_exercise_id: parsed.data.session_exercise_id,
    user_id: user.id,
    set_number: parsed.data.set_number,
    kind: parsed.data.kind,
    load: parsed.data.load ?? null,
    reps: parsed.data.reps ?? null,
    note: parsed.data.note ?? null,
    source: parsed.data.source,
    completed_at: completedAt,
  };

  const query = parsed.data.id
    ? supabase
        .from("exercise_set")
        .update(payload)
        .eq("id", parsed.data.id)
        .eq("user_id", user.id)
    : supabase
        .from("exercise_set")
        .upsert(payload, { onConflict: "session_exercise_id,set_number" });

  const { data: row, error } = await query
    .select(
      "id, session_exercise_id, set_number, kind, load, reps, completed_at, note, source, is_pr",
    )
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not save set." };
  }

  const pr = await applyMeasuredPrOnSave(supabase, {
    userId: user.id,
    setId: row.id as string,
    sessionExerciseId: parsed.data.session_exercise_id,
    kind: parsed.data.kind,
    load: parsed.data.load ?? null,
    reps: parsed.data.reps ?? null,
    completed: Boolean(completedAt),
  });

  revalidatePath(`/log/${owned.se.session_id}`);
  revalidatePath("/progress");
  revalidatePath("/history");
  return {
    ok: true,
    id: row.id,
    data: { ...row, is_pr: pr.isPr },
  };
}

export async function addSet(
  sessionExerciseId: string,
  copyFromLast = true,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const owned = await assertSessionExerciseOwner(sessionExerciseId, user.id);
  if (!owned) return { ok: false, error: "Exercise not found." };

  const { data: last } = await supabase
    .from("exercise_set")
    .select("set_number, kind, load, reps")
    .eq("session_exercise_id", sessionExerciseId)
    .eq("user_id", user.id)
    .order("set_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return upsertSet({
    session_exercise_id: sessionExerciseId,
    set_number: (last?.set_number ?? 0) + 1,
    kind: last?.kind === "warmup" ? "working" : (last?.kind ?? "working"),
    load: copyFromLast ? (last?.load ?? null) : null,
    reps: copyFromLast ? (last?.reps ?? null) : null,
    completed: false,
    source: copyFromLast && last ? "prefill" : "manual",
  });
}

export async function deleteSet(setId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data: existing } = await supabase
    .from("exercise_set")
    .select("id, session_exercise_id, is_pr, reps")
    .eq("id", setId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Set not found." };

  const { error } = await supabase
    .from("exercise_set")
    .delete()
    .eq("id", setId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc("renumber_sets", {
    p_session_exercise_id: existing.session_exercise_id,
  });

  await reassignPrAfterDelete(supabase, {
    userId: user.id,
    sessionExerciseId: existing.session_exercise_id as string,
    wasPr: Boolean(existing.is_pr),
    reps: existing.reps as number | null,
  });

  const owned = await assertSessionExerciseOwner(
    existing.session_exercise_id,
    user.id,
  );
  if (owned) revalidatePath(`/log/${owned.se.session_id}`);
  revalidatePath("/progress");
  revalidatePath("/history");
  return { ok: true, id: setId };
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!sessionId) return { ok: false, error: "Session required." };

  const { data: existing } = await supabase
    .from("workout_session")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Session not found." };

  const { error } = await supabase
    .from("workout_session")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/progress");
  revalidatePath(`/log/${sessionId}`);
  revalidatePath(`/log/${sessionId}/review`);
  return { ok: true, id: sessionId };
}

export async function finishSession(input: unknown): Promise<ActionResult> {
  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data: session } = await supabase
    .from("workout_session")
    .select(
      "id, started_at, status, updated_at, completed_at, session_rpe, note, total_volume, total_reps, total_working_sets",
    )
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return { ok: false, error: "Session not found." };

  if (
    session.status === "completed" &&
    parsed.data.expectedUpdatedAt &&
    session.updated_at &&
    session.updated_at !== parsed.data.expectedUpdatedAt
  ) {
    return {
      ok: false,
      error: "This completed workout changed on the server.",
      conflict: {
        entity: "workout_session",
        server: session,
        local: parsed.data,
      },
    };
  }

  const started = session.started_at
    ? new Date(session.started_at).getTime()
    : Date.now();
  const durationSeconds = Math.max(
    0,
    Math.round((Date.now() - started) / 1000),
  );

  await supabase.rpc("recompute_session_totals", {
    p_session_id: session.id,
  });

  const { data, error } = await supabase
    .from("workout_session")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      session_rpe: parsed.data.session_rpe ?? null,
      fatigue_before: parsed.data.fatigue_before ?? null,
      soreness_after: parsed.data.soreness_after ?? null,
      note: parsed.data.note ?? null,
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .select("id, total_volume, total_reps, total_working_sets, duration_seconds")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not finish session." };
  }

  try {
    const { applySessionToWeekPlan } = await import("@/app/actions/plan");
    await applySessionToWeekPlan(session.id as string);
  } catch {
    // Plan update is best-effort; finishing the session already succeeded.
  }

  revalidatePath(`/log/${session.id}`);
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/progress");
  return { ok: true, id: data.id, data };
}

export async function ensureDefaultSets(
  sessionId: string,
  options?: { revalidate?: boolean },
): Promise<ActionResult> {
  const result = await seedDefaultSets(sessionId);
  if (!result.ok) return result;
  if (options?.revalidate !== false) {
    revalidatePath(`/log/${sessionId}`);
  }
  return { ok: true };
}

export async function getPreviousPerformance(exerciseId: string) {
  return previousPerformanceSummary(exerciseId);
}
